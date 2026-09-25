import Foundation
import Observation
import UIKit

typealias BackgroundWork = @MainActor @Sendable (@escaping @MainActor () async -> Void) async -> Void

@MainActor
@Observable
final class SaveQueueStore {
    private(set) var state = SaveQueueState()

    var currentFeedback: QueueEntry? { SaveQueueReducer.currentFeedback(in: state) }

    private let api: (any DrinkQueueAPI)?
    private let sessionStore: SessionStore
    private let configuration: AppConfiguration?
    private let pendingDeletes: PendingDeleteStore
    private let clock: any Clock
    private let undoWindow: TimeInterval
    private let sleep: @Sendable (Duration) async throws -> Void
    private let backgroundWork: BackgroundWork
    private var sequence = 0
    private var expiryTasks: [UUID: Task<Void, Never>] = [:]
    private var inFlightDeletes: Set<UUID> = []
    private var operationTasks: [UUID: Task<Void, Never>] = [:]
    private var accountGeneration = 0
    private var undoneDrinkIDsByDate: [String: Set<Int>] = [:]

    init(
        api: (any DrinkQueueAPI)?,
        sessionStore: SessionStore,
        configuration: AppConfiguration?,
        pendingDeletes: PendingDeleteStore = PendingDeleteStore(),
        clock: any Clock = SystemClock(),
        undoWindow: TimeInterval = 6.5,
        sleep: @escaping @Sendable (Duration) async throws -> Void = { try await Task.sleep(for: $0) },
        backgroundWork: @escaping BackgroundWork = { work in
            let task = Task { await work() }
            let identifier = UIApplication.shared.beginBackgroundTask {
                Task { @MainActor in task.cancel() }
            }
            guard identifier != .invalid else {
                task.cancel()
                return
            }
            await task.value
            UIApplication.shared.endBackgroundTask(identifier)
        }
    ) {
        self.api = api
        self.sessionStore = sessionStore
        self.configuration = configuration
        self.pendingDeletes = pendingDeletes
        self.clock = clock
        self.undoWindow = undoWindow
        self.sleep = sleep
        self.backgroundWork = backgroundWork
    }

    @discardableResult
    func save(_ operation: SaveOperation) -> UUID {
        sequence += 1
        let entry = QueueEntry(id: UUID(), sequence: sequence, kind: .save(operation), status: .saving, drinkIDs: [])
        dispatch(.saveStarted(entry))
        guard api != nil else {
            dispatch(.failed(id: entry.id, failure: QueueFailure(kind: .unknown, message: "API configuration is unavailable.", rowCountBaseline: nil)))
            return entry.id
        }
        let generation = accountGeneration
        operationTasks[entry.id] = Task {
            await performSave(entry, generation: generation)
            operationTasks[entry.id] = nil
        }
        return entry.id
    }

    @discardableResult
    func delete(_ operation: DeleteOperation) -> UUID? {
        let ids = Array(Set(operation.drinkIDs)).sorted()
        guard !ids.isEmpty else { return nil }
        sequence += 1
        let normalized = DeleteOperation(label: operation.label, date: operation.date, drinkIDs: ids)
        let until = clock.now.addingTimeInterval(undoWindow)
        let entry = QueueEntry(id: UUID(), sequence: sequence, kind: .delete(normalized), status: .undoable(until: until), drinkIDs: ids)
        dispatch(.deleteStarted(entry))
        scheduleExpiry(for: entry.id, until: until)
        flushReadyDeletes()
        return entry.id
    }

    func undoCurrent() {
        guard let entry = currentFeedback, case .undoable = entry.status else { return }
        expiryTasks.removeValue(forKey: entry.id)?.cancel()
        dispatch(.undoRequested(id: entry.id))
        guard case .save = entry.kind else {
            dispatch(.undoSucceeded(id: entry.id))
            dispatch(.remove(id: entry.id))
            return
        }
        guard let api else {
            dispatch(.failed(id: entry.id, failure: QueueFailure(kind: .unknown, message: "API configuration is unavailable.", rowCountBaseline: nil)))
            return
        }
        let generation = accountGeneration
        Task {
            do {
                if !entry.drinkIDs.isEmpty { _ = try await api.deleteDrinks(ids: entry.drinkIDs) }
                guard generation == accountGeneration, sessionStore.userID != nil else { return }
                if case .save(let operation) = entry.kind, !entry.drinkIDs.isEmpty {
                    undoneDrinkIDsByDate[operation.date, default: []].formUnion(entry.drinkIDs)
                }
                dispatch(.undoSucceeded(id: entry.id))
                dispatch(.remove(id: entry.id))
            } catch {
                dispatch(.failed(id: entry.id, failure: failure(for: error, baseline: nil, message: "Could not undo save.")))
            }
        }
    }

    func sessionDidSignOut() {
        accountGeneration += 1
        expiryTasks.values.forEach { $0.cancel() }
        expiryTasks.removeAll()
        operationTasks.values.forEach { $0.cancel() }
        operationTasks.removeAll()
        undoneDrinkIDsByDate.removeAll()
        state = SaveQueueState()
    }

    func retryCurrent() {
        guard let entry = currentFeedback, case .failed(let failure) = entry.status else { return }
        guard let api else { return }
        dispatch(.retryRequested(id: entry.id))
        switch entry.kind {
        case .delete:
            let generation = accountGeneration
            Task { await performDelete(entry, generation: generation) }
        case .save(let operation):
            let generation = accountGeneration
            guard failure.kind == .timeout, let baseline = failure.rowCountBaseline else {
                Task { await performSave(entry, generation: generation) }
                return
            }
            Task {
                do {
                    let rows = try await api.drinks(date: operation.date)
                    guard generation == accountGeneration, sessionStore.userID != nil else { return }
                    guard rows.count <= baseline else {
                        dispatch(.commit(id: entry.id))
                        return
                    }
                } catch {
                    // A failed verification falls back to one ordinary retry, as the web client does.
                }
                guard generation == accountGeneration, sessionStore.userID != nil else { return }
                await performSave(entry, generation: generation)
            }
        }
    }

    @discardableResult
    func applicationWillEnterBackground() -> [UUID] {
        let deletes = state.entries.filter { entry in
            guard case .delete = entry.kind else { return false }
            if case .undoable = entry.status { return true }
            if case .saving = entry.status { return true }
            return false
        }
        guard let subject = sessionStore.userID, let configuration else {
            state = SaveQueueReducer.reduce(state, .expire(now: .distantFuture))
            return []
        }

        var persisted = Set<UUID>()
        for entry in deletes {
            guard let record = PendingDeleteRecord(
                entry: entry,
                environment: configuration.environment,
                issuer: configuration.issuerURL,
                subject: subject
            ) else { continue }
            do {
                try pendingDeletes.insert(record)
                persisted.insert(entry.id)
            } catch {
                dispatch(.failed(id: entry.id, failure: QueueFailure(kind: .unknown, message: "Could not preserve delete for recovery.", rowCountBaseline: nil)))
            }
        }

        state = SaveQueueReducer.reduce(state, .expire(now: .distantFuture))
        return persisted.filter { !inFlightDeletes.contains($0) }
    }

    func flushBackgroundDeletes(_ operationIDs: [UUID]) async {
        guard !operationIDs.isEmpty else { return }
        let generation = accountGeneration
        await backgroundWork { [weak self] in
            guard let self else { return }
            for id in operationIDs {
                guard !Task.isCancelled, generation == accountGeneration,
                      let entry = state.entries.first(where: { $0.id == id }) else { continue }
                await performDelete(entry, generation: generation)
            }
        }
    }

    func reconcilePersistedDeletes() async {
        guard let subject = sessionStore.userID, let configuration, let api,
              let records = try? pendingDeletes.records() else { return }
        for record in records where record.environment == configuration.environment && record.issuer == configuration.issuerURL && record.subject == subject {
            do {
                _ = try await api.deleteDrinks(ids: record.drinkIDs)
                guard sessionStore.userID == subject else { return }
                try pendingDeletes.remove(operationID: record.operationID)
                dispatch(.remove(id: record.operationID))
            } catch {
                continue
            }
        }
    }

    func expireDueEntries() {
        state = SaveQueueReducer.sweep(state, now: clock.now)
        flushReadyDeletes()
    }

    func pendingInsertions(for date: String) -> [EditableDrink] {
        SaveQueueReducer.pendingInsertions(in: state, date: date)
    }

    func suppressedDrinkIDs(for date: String) -> Set<Int> {
        SaveQueueReducer.suppressedIDs(in: state, date: date).union(undoneDrinkIDsByDate[date, default: []])
    }

    func merge(_ serverRows: [EditableDrink], for date: String) -> [EditableDrink] {
        let serverIDs = Set(serverRows.map(\.id))
        undoneDrinkIDsByDate[date]?.formIntersection(serverIDs)
        if undoneDrinkIDsByDate[date]?.isEmpty == true { undoneDrinkIDsByDate[date] = nil }
        state = SaveQueueReducer.reduce(state, .cleanupAcknowledged(date: date, serverIDs: Set(serverRows.map(\.id))))
        let merged = SaveQueueReducer.merge(serverRows, with: state, date: date)
        return merged.filter { !undoneDrinkIDsByDate[date, default: []].contains($0.id) }
    }

    private func performSave(_ entry: QueueEntry, generation: Int) async {
        guard case .save(let operation) = entry.kind, let api else { return }
        do {
            let saved = try await api.saveDrink(operation.payload)
            guard generation == accountGeneration, sessionStore.userID != nil else { return }
            let until = clock.now.addingTimeInterval(undoWindow)
            dispatch(.saveSucceeded(id: entry.id, drinkIDs: saved.map(\.id), undoUntil: until))
            scheduleExpiry(for: entry.id, until: until)
            flushReadyDeletes()
        } catch {
            guard generation == accountGeneration, sessionStore.userID != nil else { return }
            let baseline = (error as? APIError) == .timeout ? operation.rowCountBaseline : nil
            dispatch(.failed(id: entry.id, failure: failure(for: error, baseline: baseline, message: "Could not save.")))
        }
    }

    private func performDelete(_ entry: QueueEntry, generation: Int) async {
        guard case .delete = entry.kind, !inFlightDeletes.contains(entry.id) else { return }
        guard let api else {
            dispatch(.failed(id: entry.id, failure: QueueFailure(kind: .unknown, message: "API configuration is unavailable.", rowCountBaseline: nil)))
            return
        }
        inFlightDeletes.insert(entry.id)
        defer { inFlightDeletes.remove(entry.id) }
        do {
            _ = try await api.deleteDrinks(ids: entry.drinkIDs)
            guard generation == accountGeneration, sessionStore.userID != nil else { return }
            try? pendingDeletes.remove(operationID: entry.id)
            dispatch(.commit(id: entry.id))
        } catch {
            guard generation == accountGeneration, sessionStore.userID != nil else { return }
            dispatch(.failed(id: entry.id, failure: failure(for: error, baseline: nil, message: "Could not delete.")))
        }
    }

    private func flushReadyDeletes() {
        for entry in state.entries where isDeleteSaving(entry) {
            let generation = accountGeneration
            Task { await performDelete(entry, generation: generation) }
        }
    }

    private func scheduleExpiry(for id: UUID, until: Date) {
        expiryTasks[id]?.cancel()
        expiryTasks[id] = Task { [weak self] in
            guard let self else { return }
            let seconds = max(0, until.timeIntervalSince(clock.now))
            do { try await sleep(.seconds(seconds)) } catch { return }
            guard !Task.isCancelled else { return }
            expireDueEntries()
            expiryTasks[id] = nil
        }
    }

    private func dispatch(_ action: SaveQueueAction) {
        state = SaveQueueReducer.reduce(state, action)
    }

    private func failure(for error: Error, baseline: Int?, message: String) -> QueueFailure {
        let apiError = error as? APIError
        let kind: QueueFailure.Kind
        switch apiError {
        case .timeout: kind = .timeout
        case .connection: kind = .connection
        case .client: kind = .client
        case .server: kind = .server
        case .authentication: kind = .authentication
        default: kind = .unknown
        }
        return QueueFailure(kind: kind, message: message, rowCountBaseline: baseline)
    }

    private func isDeleteSaving(_ entry: QueueEntry) -> Bool {
        guard case .delete = entry.kind, case .saving = entry.status else { return false }
        return true
    }
}

private extension PendingDeleteRecord {
    init?(entry: QueueEntry, environment: AppConfiguration.Environment, issuer: URL, subject: String) {
        guard case .delete = entry.kind else { return nil }
        self.init(operationID: entry.id, drinkIDs: entry.drinkIDs, environment: environment, issuer: issuer, subject: subject)
    }
}
