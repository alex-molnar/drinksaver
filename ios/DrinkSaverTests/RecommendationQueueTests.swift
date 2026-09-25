import XCTest
@testable import DrinkSaver

@MainActor
final class RecommendationQueueTests: XCTestCase {
    func testDeleteIsHiddenDuringUndoWindowAndRestoresVisibilityOnUndo() {
        let queue = RecommendationQueue(api: nil, window: .seconds(3600))
        queue.delete(id: 17, label: "Pale Ale")
        XCTAssertEqual(queue.hiddenIDs, [17])
        XCTAssertNotNil(queue.currentFeedback)

        queue.undoCurrent()

        XCTAssertTrue(queue.hiddenIDs.isEmpty)
        if case .undone? = queue.entries.first?.status {} else { XCTFail("Delete should be marked undone") }
    }
}
