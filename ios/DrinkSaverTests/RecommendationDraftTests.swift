import XCTest
@testable import DrinkSaver

final class RecommendationDraftTests: XCTestCase {
    func testEditableRowsRequireAnIDAndTheCurrentUser() {
        let source = recommendation(id: 4, user: "me", name: "Mine")
        XCTAssertEqual(RecommendationsStore.savedRows(from: [
            source, recommendation(id: 5, user: "someone-else", name: "Other"),
            recommendation(id: nil, user: "me", name: "Default")
        ], userID: "me"), [SavedRecommendation(id: 4, name: "Mine")])
    }

    func testSyncPreservesNamesAndOrderAndAppendsNewIDs() {
        let rows = [SavedRecommendation(id: 1, name: "Server one"), SavedRecommendation(id: 2, name: "Two"), SavedRecommendation(id: 3, name: "Three")]
        var draft = RecommendationDraft(order: [2, 1], names: [1: "Renamed", 2: "Two"],
            committed: RecommendationSnapshot(order: [2, 1], names: [1: "One", 2: "Two"]))
        draft = RecommendationDraftLogic.sync(draft, rows: rows)
        XCTAssertEqual(draft.order, [2, 1, 3])
        XCTAssertEqual(draft.names, [1: "Renamed", 2: "Two", 3: "Three"])
        XCTAssertEqual(draft.committed.names[1], "One")
    }

    func testVisibleReorderKeepsHiddenSlotAndPayloadOmitsHiddenRow() {
        let rows = [SavedRecommendation(id: 1, name: "One"), SavedRecommendation(id: 2, name: "Two"), SavedRecommendation(id: 3, name: "Three")]
        let draft = RecommendationDraft(order: [1, 2, 3], names: [1: "First", 2: "Two", 3: "Third"],
            committed: RecommendationSnapshot(order: [1, 2, 3], names: [1: "One", 2: "Two", 3: "Three"]))
        let reordered = RecommendationDraftLogic.reorder(draft, visibleOrder: [3, 1], hidden: [2])
        XCTAssertEqual(reordered.order, [3, 2, 1])
        XCTAssertTrue(RecommendationDraftLogic.isDirty(reordered, hidden: [2]))
        XCTAssertEqual(RecommendationDraftLogic.payload(reordered, rows: rows, hidden: [2]), [
            RecommendationEdit(id: 3, name: "Third"), RecommendationEdit(id: 1, name: "First")
        ])
        XCTAssertEqual(RecommendationDraftLogic.reorder(draft, visibleOrder: [1], hidden: [2]), draft)
    }

    private func recommendation(id: Int?, user: String, name: String) -> Recommendation {
        Recommendation(id: id, userId: user, name: name, alcoholTypeId: nil, alcoholSubtypeId: nil,
            alcoholVolumeId: nil, brandId: nil, beerFlavourId: nil, consumptionTypeId: nil,
            endDate: nil, colorPaletteId: nil, glasswareId: nil, orderNumber: nil)
    }
}
