import Foundation

struct SaveOperation: Equatable, Sendable {
    let label: String
    let date: String
    let alcoholTypeID: Int
    let payload: DrinkSaveRequest
    let rowCountBaseline: Int?
}

struct DeleteOperation: Equatable, Sendable {
    let label: String
    let date: String
    let drinkIDs: [Int]
}

struct QueueFailure: Equatable, Sendable {
    enum Kind: Equatable, Sendable { case timeout, connection, client, server, authentication, unknown }
    let kind: Kind
    let message: String
    let rowCountBaseline: Int?
}

enum QueueStatus: Equatable, Sendable {
    case saving
    case undoable(until: Date)
    case undoing
    case failed(QueueFailure)
    case committed
}

enum QueueKind: Equatable, Sendable {
    case save(SaveOperation)
    case delete(DeleteOperation)
}

struct QueueEntry: Identifiable, Equatable, Sendable {
    let id: UUID
    let sequence: Int
    var kind: QueueKind
    var status: QueueStatus
    var drinkIDs: [Int]
}

struct SaveQueueState: Equatable, Sendable {
    var entries: [QueueEntry] = []
}

enum SaveQueueAction: Sendable {
    case saveStarted(QueueEntry)
    case saveSucceeded(id: UUID, drinkIDs: [Int], undoUntil: Date)
    case deleteStarted(QueueEntry)
    case failed(id: UUID, failure: QueueFailure)
    case undoRequested(id: UUID)
    case undoSucceeded(id: UUID)
    case retryRequested(id: UUID)
    case expire(now: Date)
    case commit(id: UUID)
    case remove(id: UUID)
    case removeCommitted
    case cleanupAcknowledged(date: String, serverIDs: Set<Int>)
}

enum SaveQueueReducer {
    static func reduce(_ state: SaveQueueState, _ action: SaveQueueAction) -> SaveQueueState {
        switch action {
        case .saveStarted(let entry):
            var next = state
            next.entries.removeAll { if case .committed = $0.status { true } else { false } }
            next.entries.append(entry)
            return next
        case .deleteStarted(let entry):
            var next = state
            next.entries.removeAll { if case .committed = $0.status { true } else { false } }
            next.entries.append(entry)
            next.entries = supersedeUndoables(in: next.entries, olderThan: entry.sequence, keeping: entry.id)
            return next
        case .saveSucceeded(let id, let drinkIDs, let undoUntil):
            guard let completed = state.entries.first(where: { $0.id == id }) else { return state }
            guard case .saving = completed.status else { return state }
            let newerOperationExists = state.entries.contains { $0.sequence > completed.sequence }
            var next = updating(state, id: id) {
                $0.drinkIDs = drinkIDs
                $0.status = newerOperationExists ? .committed : .undoable(until: undoUntil)
            }
            next.entries = supersedeUndoables(in: next.entries, olderThan: completed.sequence, keeping: id)
            return next
        case .failed(let id, let failure):
            return updating(state, id: id) { $0.status = .failed(failure) }
        case .undoRequested(let id):
            return updating(state, id: id) {
                guard case .undoable = $0.status else { return }
                $0.status = .undoing
            }
        case .undoSucceeded(let id):
            return updating(state, id: id) { $0.status = .committed }
        case .retryRequested(let id):
            return updating(state, id: id) {
                guard case .failed = $0.status else { return }
                $0.status = .saving
            }
        case .expire(let now):
            var next = state
            for index in next.entries.indices {
                guard case .undoable(let until) = next.entries[index].status, until <= now else { continue }
                if case .delete = next.entries[index].kind {
                    next.entries[index].status = .saving
                } else {
                    next.entries[index].status = .committed
                }
            }
            return next
        case .commit(let id):
            return updating(state, id: id) { $0.status = .committed }
        case .remove(let id):
            var next = state
            next.entries.removeAll { $0.id == id }
            return next
        case .removeCommitted:
            var next = state
            next.entries.removeAll { if case .committed = $0.status { true } else { false } }
            return next
        case .cleanupAcknowledged(let date, let serverIDs):
            var next = state
            next.entries.removeAll { entry in
                guard entry.kind.date == date, case .committed = entry.status else { return false }
                switch entry.kind {
                case .save: return !entry.drinkIDs.isEmpty && Set(entry.drinkIDs).isSubset(of: serverIDs)
                case .delete: return entry.drinkIDs.allSatisfy { !serverIDs.contains($0) }
                }
            }
            return next
        }
    }

    static func sweep(_ state: SaveQueueState, now: Date) -> SaveQueueState {
        reduce(state, .expire(now: now))
    }

    static func currentFeedback(in state: SaveQueueState) -> QueueEntry? {
        state.entries
            .filter { if case .undoable = $0.status { true } else if case .undoing = $0.status { true } else if case .failed = $0.status { true } else { false } }
            .max { $0.sequence < $1.sequence }
    }

    static func pendingInsertions(in state: SaveQueueState, date: String) -> [EditableDrink] {
        state.entries.flatMap { entry -> [EditableDrink] in
            guard case .save(let operation) = entry.kind, operation.date == date else { return [] }
            switch entry.status {
            case .saving, .undoable, .undoing, .committed:
                return entry.drinkIDs.map { EditableDrink(id: $0, name: operation.label, alcoholTypeId: operation.alcoholTypeID) }
            case .failed:
                return entry.drinkIDs.isEmpty ? [] : entry.drinkIDs.map { EditableDrink(id: $0, name: operation.label, alcoholTypeId: operation.alcoholTypeID) }
            }
        }
    }

    static func suppressedIDs(in state: SaveQueueState, date: String) -> Set<Int> {
        state.entries.reduce(into: Set<Int>()) { ids, entry in
            guard case .delete(let operation) = entry.kind, operation.date == date else { return }
            switch entry.status {
            case .undoable, .undoing, .saving, .committed: ids.formUnion(entry.drinkIDs)
            case .failed: break
            }
        }
    }

    static func merge(_ serverRows: [EditableDrink], with state: SaveQueueState, date: String) -> [EditableDrink] {
        let suppressed = suppressedIDs(in: state, date: date)
        var rows = serverRows.filter { !suppressed.contains($0.id) }
        let existing = Set(rows.map(\.id))
        rows.append(contentsOf: pendingInsertions(in: state, date: date).filter { !existing.contains($0.id) && !suppressed.contains($0.id) })
        return rows
    }

    private static func updating(_ state: SaveQueueState, id: UUID, _ update: (inout QueueEntry) -> Void) -> SaveQueueState {
        var next = state
        guard let index = next.entries.firstIndex(where: { $0.id == id }) else { return state }
        update(&next.entries[index])
        return next
    }

    private static func supersedeUndoables(in entries: [QueueEntry], olderThan sequence: Int, keeping id: UUID) -> [QueueEntry] {
        entries.map { entry in
            guard entry.id != id, entry.sequence < sequence, case .undoable = entry.status else { return entry }
            var finalized = entry
            if case .delete = entry.kind { finalized.status = .saving }
            else { finalized.status = .committed }
            return finalized
        }
    }
}

private extension QueueKind {
    var date: String {
        switch self {
        case .save(let operation): operation.date
        case .delete(let operation): operation.date
        }
    }
}
