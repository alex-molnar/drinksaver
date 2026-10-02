import XCTest
@testable import DrinkSaver

final class PendingDeleteStoreTests: XCTestCase {
    func testInsertMergesByOperationIDAndRoundTripsTheAuthorizationScope() throws {
        let (store, directory) = makeStore()
        defer { try? FileManager.default.removeItem(at: directory) }
        let operationID = UUID()
        let original = record(id: operationID, drinkIDs: [1, 2], subject: "subject-a")
        try store.insert(original)
        try store.insert(record(id: operationID, drinkIDs: [3], subject: "subject-a"))

        XCTAssertEqual(try store.records(), [record(id: operationID, drinkIDs: [3], subject: "subject-a")])
    }

    func testRemoveDeletesOnlyTheMatchingOperationAndClearsEmptyFile() throws {
        let (store, directory) = makeStore()
        defer { try? FileManager.default.removeItem(at: directory) }
        let first = record(id: UUID(), drinkIDs: [1], subject: "subject-a")
        let second = record(id: UUID(), drinkIDs: [2], subject: "subject-b")
        try store.insert(first)
        try store.insert(second)

        try store.remove(operationID: first.operationID)
        XCTAssertEqual(try store.records(), [second])
        try store.remove(operationID: second.operationID)
        XCTAssertEqual(try store.records(), [])
    }

    private func makeStore() -> (PendingDeleteStore, URL) {
        let directory = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString, isDirectory: true)
        return (PendingDeleteStore(fileURL: directory.appendingPathComponent("pending.json")), directory)
    }

    private func record(id: UUID, drinkIDs: [Int], subject: String) -> PendingDeleteRecord {
        PendingDeleteRecord(
            operationID: id,
            drinkIDs: drinkIDs,
            environment: .test,
            issuer: URL(string: "https://auth.example.test/realm")!,
            subject: subject
        )
    }
}
