import XCTest
@testable import DrinkSaver

final class SaveQueueReducerTests: XCTestCase {
    private let now = Date(timeIntervalSince1970: 10_000)

    func testSaveBeginsImmediatelyAndSuccessKeepsEveryReturnedIDUndoable() {
        let op = saveOperation()
        let entry = QueueEntry(id: UUID(), sequence: 1, kind: .save(op), status: .saving, drinkIDs: [])
        let saving = SaveQueueReducer.reduce(SaveQueueState(), .saveStarted(entry))
        XCTAssertEqual(saving.entries[0].status, .saving)

        let saved = SaveQueueReducer.reduce(saving, .saveSucceeded(id: entry.id, drinkIDs: [12, 13], undoUntil: now.addingTimeInterval(6.5)))
        XCTAssertEqual(saved.entries[0].drinkIDs, [12, 13])
        XCTAssertEqual(saved.entries[0].status, .undoable(until: now.addingTimeInterval(6.5)))
    }

    func testDeleteIsDeferredAndExpiresAtExactlySixPointFiveSeconds() {
        let entry = deleteEntry(sequence: 1, ids: [4, 5], until: now.addingTimeInterval(6.5))
        let queued = SaveQueueReducer.reduce(SaveQueueState(), .deleteStarted(entry))
        XCTAssertEqual(queued.entries[0].status, .undoable(until: now.addingTimeInterval(6.5)))
        XCTAssertEqual(SaveQueueReducer.sweep(queued, now: now.addingTimeInterval(6.499)), queued)
        let saving = SaveQueueReducer.sweep(queued, now: now.addingTimeInterval(6.5))
        XCTAssertEqual(saving.entries[0].status, .saving)
        XCTAssertEqual(SaveQueueReducer.currentFeedback(in: saving)?.id, entry.id)
    }

    func testNewUndoableOperationSupersedesOlderDeleteAndSave() {
        let save = saveEntry(sequence: 1)
        var state = SaveQueueReducer.reduce(SaveQueueState(), .saveStarted(save))
        state = SaveQueueReducer.reduce(state, .saveSucceeded(id: save.id, drinkIDs: [1], undoUntil: now.addingTimeInterval(10)))
        let delete = deleteEntry(sequence: 2, ids: [9], until: now.addingTimeInterval(10))
        state = SaveQueueReducer.reduce(state, .deleteStarted(delete))
        XCTAssertEqual(state.entries.first { $0.id == save.id }?.status, .committed)
        XCTAssertEqual(SaveQueueReducer.currentFeedback(in: state)?.id, delete.id)

        let next = deleteEntry(sequence: 3, ids: [10], until: now.addingTimeInterval(10))
        state = SaveQueueReducer.reduce(state, .deleteStarted(next))
        XCTAssertEqual(state.entries.first { $0.id == delete.id }?.status, .saving)
        XCTAssertEqual(SaveQueueReducer.currentFeedback(in: state)?.id, next.id)
    }

    func testLateOlderSaveCompletionDoesNotSupersedeNewerDelete() {
        let save = saveEntry(sequence: 1)
        var state = SaveQueueReducer.reduce(SaveQueueState(), .saveStarted(save))
        let delete = deleteEntry(sequence: 2, ids: [9], until: now.addingTimeInterval(10))
        state = SaveQueueReducer.reduce(state, .deleteStarted(delete))

        state = SaveQueueReducer.reduce(state, .saveSucceeded(id: save.id, drinkIDs: [1], undoUntil: now.addingTimeInterval(6.5)))

        XCTAssertEqual(state.entries.first { $0.id == save.id }?.status, .committed)
        XCTAssertEqual(state.entries.first { $0.id == delete.id }?.status, .undoable(until: now.addingTimeInterval(10)))
        XCTAssertEqual(SaveQueueReducer.currentFeedback(in: state)?.id, delete.id)
    }

    func testUndoTransitionsAndDeleteUndoDoesNotCreateAnyNetworkIntent() {
        let delete = deleteEntry(sequence: 1, ids: [8], until: now.addingTimeInterval(10))
        let state = SaveQueueReducer.reduce(SaveQueueState(), .deleteStarted(delete))
        let undoing = SaveQueueReducer.reduce(state, .undoRequested(id: delete.id))
        XCTAssertEqual(undoing.entries[0].status, .undoing)
        XCTAssertEqual(SaveQueueReducer.reduce(undoing, .undoSucceeded(id: delete.id)).entries[0].status, .committed)
    }

    func testFailureIsStableUntilRetryThenCanBeCommittedAndRemoved() {
        let entry = saveEntry(sequence: 1)
        var state = SaveQueueReducer.reduce(SaveQueueState(), .saveStarted(entry))
        let failure = QueueFailure(kind: .connection, message: "Could not save.", rowCountBaseline: nil)
        state = SaveQueueReducer.reduce(state, .failed(id: entry.id, failure: failure))
        XCTAssertEqual(SaveQueueReducer.sweep(state, now: now.addingTimeInterval(30)), state)
        XCTAssertEqual(SaveQueueReducer.currentFeedback(in: state)?.status, .failed(failure))
        state = SaveQueueReducer.reduce(state, .retryRequested(id: entry.id))
        XCTAssertEqual(state.entries[0].status, .saving)
        state = SaveQueueReducer.reduce(state, .commit(id: entry.id))
        XCTAssertEqual(SaveQueueReducer.reduce(state, .removeCommitted).entries, [])
    }

    func testServerMergeAddsPendingSavesAndSuppressedDeleteWinsForSameID() {
        let saved = saveEntry(sequence: 1)
        var state = SaveQueueReducer.reduce(SaveQueueState(), .saveStarted(saved))
        state = SaveQueueReducer.reduce(state, .saveSucceeded(id: saved.id, drinkIDs: [6, 7], undoUntil: now.addingTimeInterval(10)))
        let delete = deleteEntry(sequence: 2, ids: [7], until: now.addingTimeInterval(10))
        state = SaveQueueReducer.reduce(state, .deleteStarted(delete))

        let merged = SaveQueueReducer.merge([EditableDrink(id: 7, name: "server", alcoholTypeId: 3), EditableDrink(id: 8, name: "existing", alcoholTypeId: 3)], with: state, date: "2026-01-02")
        XCTAssertEqual(merged.map(\.id), [8, 6])
        XCTAssertEqual(SaveQueueReducer.suppressedIDs(in: state, date: "2026-01-02"), Set([7]))
    }

    func testStartingNewSaveRetainsCommittedSaveUntilServerAcknowledgesIt() {
        let first = saveEntry(sequence: 1)
        var state = SaveQueueReducer.reduce(SaveQueueState(), .saveStarted(first))
        state = SaveQueueReducer.reduce(state, .saveSucceeded(id: first.id, drinkIDs: [6], undoUntil: now))
        state = SaveQueueReducer.reduce(state, .commit(id: first.id))

        let second = saveEntry(sequence: 2)
        state = SaveQueueReducer.reduce(state, .saveStarted(second))

        XCTAssertEqual(state.entries.first(where: { $0.id == first.id })?.status, .committed)
        XCTAssertTrue(SaveQueueReducer.pendingInsertions(in: state, date: "2026-01-02").contains { $0.id == 6 })

        state = SaveQueueReducer.reduce(state, .cleanupAcknowledged(date: "2026-01-02", serverIDs: [6]))
        XCTAssertNil(state.entries.first(where: { $0.id == first.id }))
        XCTAssertNotNil(state.entries.first(where: { $0.id == second.id }))
    }

    private func saveOperation() -> SaveOperation {
        SaveOperation(label: "Pint", date: "2026-01-02", alcoholTypeID: 3, payload: DrinkSaveRequest(alcoholTypeId: 3, alcoholVolumeId: 4), rowCountBaseline: 2)
    }

    private func saveEntry(sequence: Int) -> QueueEntry {
        QueueEntry(id: UUID(), sequence: sequence, kind: .save(saveOperation()), status: .saving, drinkIDs: [])
    }

    private func deleteEntry(sequence: Int, ids: [Int], until: Date) -> QueueEntry {
        QueueEntry(id: UUID(), sequence: sequence, kind: .delete(DeleteOperation(label: "Pint", date: "2026-01-02", drinkIDs: ids)), status: .undoable(until: until), drinkIDs: ids)
    }
}
