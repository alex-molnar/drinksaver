import Foundation
import Observation

@MainActor
@Observable
final class RecommendationQueue {
    enum Status { case undoable, undoing, undone, sending, committed, failed(String) }
    enum Kind { case delete(id: Int, label: String), save(snapshot: RecommendationSnapshot, payload: () -> [RecommendationEdit]) }
    struct Entry: Identifiable { let id: UUID; let sequence: Int; let kind: Kind; var status: Status }

    private(set) var entries: [Entry] = []
    var hiddenIDs: Set<Int> {
        Set(entries.compactMap { entry -> Int? in
            guard case .delete(let id, _) = entry.kind else { return nil }
            switch entry.status {
            case .undoable, .undoing, .sending, .committed: return id
            case .undone, .failed: return nil
            }
        })
    }
    var currentFeedback: Entry? {
        entries.last { entry in
            switch entry.status { case .undoable, .undoing, .failed: true; case .undone, .sending, .committed: false }
        }
    }
    var isSendingSave: Bool {
        entries.contains { entry in if case .save = entry.kind, case .sending = entry.status { true } else { false } }
    }

    var onSaveUndone: ((RecommendationSnapshot) -> Void)?
    var onSaveCommitted: (([Recommendation]) -> Void)?
    var onDeleteCommitted: (() async -> Void)?

    private let api: (any DrinkSaverAPI)?
    private let window: Duration
    private let sleep: @Sendable (Duration) async throws -> Void
    private var sequence = 0
    private var pumping = false
    private var generation = 0
    private var expiryTasks: [UUID: Task<Void, Never>] = [:]
    private var operationTask: Task<Void, Never>?

    init(api: (any DrinkSaverAPI)?, window: Duration = .milliseconds(6500),
         sleep: @escaping @Sendable (Duration) async throws -> Void = { try await Task.sleep(for: $0) }) {
        self.api = api; self.window = window; self.sleep = sleep
    }

    func delete(id: Int, label: String) {
        append(.delete(id: id, label: label))
    }

    func save(snapshot: RecommendationSnapshot, payload: @escaping () -> [RecommendationEdit]) {
        append(.save(snapshot: snapshot, payload: payload))
    }

    func undoCurrent() {
        guard let entry = currentFeedback, case .undoable = entry.status else { return }
        expiryTasks.removeValue(forKey: entry.id)?.cancel()
        update(entry.id) { $0.status = .undoing }
        if case .save(let snapshot, _) = entry.kind { onSaveUndone?(snapshot) }
        update(entry.id) { $0.status = .undone }
    }

    func retryCurrent() {
        guard let entry = currentFeedback, case .failed = entry.status else { return }
        update(entry.id) { $0.status = .sending }
        pump()
    }

    func sessionDidSignOut() {
        generation += 1
        expiryTasks.values.forEach { $0.cancel() }
        expiryTasks.removeAll()
        operationTask?.cancel()
        operationTask = nil
        pumping = false
        entries.removeAll()
    }

    private func append(_ kind: Kind) {
        sequence += 1
        let entry = Entry(id: UUID(), sequence: sequence, kind: kind, status: .undoable)
        var shouldPump = false
        for index in entries.indices where entries[index].status.isUndoable {
            entries[index].status = .sending; shouldPump = true
        }
        entries.append(entry)
        if shouldPump { pump() }
        let requestGeneration = generation
        expiryTasks[entry.id] = Task { [weak self, sleep, window] in
            do { try await sleep(window) } catch { return }
            guard let self, self.generation == requestGeneration else { return }
            self.expiryTasks[entry.id] = nil
            guard let index = self.entries.firstIndex(where: { $0.id == entry.id }),
                  self.entries[index].status.isUndoable else { return }
            self.entries[index].status = .sending
            self.pump()
        }
    }

    private func pump() {
        guard !pumping else { return }
        pumping = true
        let requestGeneration = generation
        operationTask = Task { [weak self] in
            guard let self else { return }
            defer {
                if self.generation == requestGeneration {
                    self.pumping = false
                    self.operationTask = nil
                }
            }
            while self.generation == requestGeneration,
                  let index = self.entries.firstIndex(where: { $0.status.isSending }) {
                let entry = self.entries[index]
                if case .save = entry.kind,
                   self.entries[..<index].contains(where: { if case .delete = $0.kind { if case .failed = $0.status { return true } }; return false }) { return }
                guard let api = self.api else { self.update(entry.id) { $0.status = .failed("Recommendations are unavailable.") }; continue }
                do {
                    switch entry.kind {
                    case .delete(let id, _):
                        try await api.deleteRecommendation(id: id)
                        guard self.generation == requestGeneration else { return }
                        self.update(entry.id) { $0.status = .committed }
                        await self.onDeleteCommitted?()
                    case .save(_, let payload):
                        let result = try await api.editRecommendations(payload())
                        guard self.generation == requestGeneration else { return }
                        self.update(entry.id) { $0.status = .committed }
                        self.onSaveCommitted?(result)
                    }
                } catch {
                    guard self.generation == requestGeneration else { return }
                    self.update(entry.id) { $0.status = .failed("Could not update recommendations. Try again.") }
                }
            }
        }
    }

    private func update(_ id: UUID, _ change: (inout Entry) -> Void) {
        guard let index = entries.firstIndex(where: { $0.id == id }) else { return }
        change(&entries[index])
    }
}

private extension RecommendationQueue.Status {
    var isUndoable: Bool { if case .undoable = self { true } else { false } }
    var isSending: Bool { if case .sending = self { true } else { false } }
}
