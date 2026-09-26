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

    func testAccessibilityFocusPausesRecommendationUndoExpiry() async {
        let queue = RecommendationQueue(api: nil, window: .zero, sleep: { _ in try await Task.sleep(for: .seconds(3600)) })
        queue.delete(id: 17, label: "Pale Ale")
        queue.setFeedbackInteractionActive(true)

        queue.expireDueEntries(now: .distantFuture)

        XCTAssertEqual(queue.feedbackSnapshot?.state, .undoable)
        queue.setFeedbackInteractionActive(false)
        queue.expireDueEntries(now: .distantFuture)

        for _ in 0..<100 where queue.feedbackSnapshot?.state != .failed("Recommendations are unavailable.") {
            try? await Task.sleep(for: .milliseconds(10))
        }
        XCTAssertEqual(queue.feedbackSnapshot?.state, .failed("Recommendations are unavailable."))
    }

    func testSignOutClearsQueueAndIgnoresAnInFlightDeleteCompletion() async {
        let api = DeferredDeleteAPI()
        let queue = RecommendationQueue(api: api, window: .zero, sleep: { _ in })
        var didReload = false
        queue.onDeleteCommitted = { didReload = true }

        queue.delete(id: 17, label: "Pale Ale")
        await api.waitUntilDeleteStarts()
        queue.sessionDidSignOut()
        await api.completeDelete()
        try? await Task.sleep(for: .milliseconds(20))

        XCTAssertTrue(queue.entries.isEmpty)
        XCTAssertTrue(queue.hiddenIDs.isEmpty)
        XCTAssertFalse(didReload)
    }
}

private actor DeferredDeleteAPI: DrinkSaverAPI {
    private var deleteStarted = false
    private var startContinuation: CheckedContinuation<Void, Never>?
    private var deleteContinuation: CheckedContinuation<Void, Never>?

    func waitUntilDeleteStarts() async {
        if deleteStarted { return }
        await withCheckedContinuation { startContinuation = $0 }
    }

    func completeDelete() { deleteContinuation?.resume(); deleteContinuation = nil }

    func deleteRecommendation(id: Int) async throws {
        deleteStarted = true
        startContinuation?.resume(); startContinuation = nil
        await withCheckedContinuation { deleteContinuation = $0 }
    }

    func recommendations() async throws -> [Recommendation] { [] }
    func editRecommendations(_ edits: [RecommendationEdit]) async throws -> [Recommendation] { [] }
    func palettes() async throws -> [Palette] { [] }
    func glassware() async throws -> [Glassware] { [] }
    func drinks(date: String) async throws -> [EditableDrink] { [] }
    func deleteDrinks(ids: [Int]) async throws -> Int { ids.count }
    func saveDrink(_ request: DrinkSaveRequest) async throws -> [SavedDrink] { [] }
    func alcoholTypes() async throws -> [AlcoholType] { [] }
    func createAlcoholType(_ entry: NewAlcoholEntry) async throws -> AlcoholType { throw APIError.decoding }
    func volumes(alcoholTypeID: Int) async throws -> [AlcoholVolume] { [] }
    func createVolume(alcoholTypeID: Int, entry: NewVolumeEntry) async throws -> AlcoholVolume { throw APIError.decoding }
    func subtypes(alcoholTypeID: Int) async throws -> [AlcoholSubtype] { [] }
    func createSubtype(alcoholTypeID: Int, entry: NewAlcoholSubtype) async throws -> AlcoholSubtype { throw APIError.decoding }
    func consumptionTypes(amount: Int) async throws -> [ConsumptionType] { [] }
    func brands() async throws -> [Brand] { [] }
    func createBrand(_ entry: NewBeerBrand) async throws -> Brand { throw APIError.decoding }
    func flavours(brandID: Int) async throws -> [BeerFlavour] { [] }
    func createFlavour(brandID: Int, entry: NewBeerFlavour) async throws -> BeerFlavour { throw APIError.decoding }
}
