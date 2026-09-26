import XCTest
@testable import DrinkSaver

@MainActor
final class SceneLifecycleHandlerTests: XCTestCase {
    func testNewerRecommendationFeedbackWinsWithoutReplacingDrinkQueueOperation() {
        let session = SessionStore(authorizationProvider: nil)
        let drinks = SaveQueueStore(api: nil, sessionStore: session, configuration: nil)
        let recommendations = RecommendationQueue(api: nil, window: .seconds(3600))
        let arbiter = FeedbackArbiter()
        let drinkID = drinks.delete(DeleteOperation(label: "Pale Ale", date: "2026-09-26", drinkIDs: [17]))!

        arbiter.refresh(drinks: drinks.currentFeedback, recommendations: nil)
        XCTAssertEqual(arbiter.current?.source, .drinks)

        recommendations.delete(id: 9, label: "House Pilsner")
        arbiter.refresh(drinks: drinks.currentFeedback, recommendations: recommendations.feedbackSnapshot)

        XCTAssertEqual(arbiter.current?.source, .recommendations)
        XCTAssertEqual(arbiter.current?.message, "Crossed off House Pilsner")
        XCTAssertEqual(drinks.currentFeedback?.id, drinkID)
        if case .undoable? = drinks.currentFeedback?.status {} else { XCTFail("Drink delete should remain undoable") }

        arbiter.performCurrentAction(drinks: drinks, recommendations: RecommendationsStore(
            api: nil,
            session: session,
            coordinator: AppCoordinator(),
            queue: recommendations
        ))

        XCTAssertNil(recommendations.currentFeedback)
        XCTAssertEqual(drinks.currentFeedback?.id, drinkID)
        arbiter.refresh(drinks: drinks.currentFeedback, recommendations: nil)
        XCTAssertEqual(arbiter.current?.source, .drinks)
        arbiter.performCurrentAction(drinks: drinks, recommendations: nil)
        XCTAssertNil(drinks.currentFeedback)
    }

    func testBackgroundingRetractsRecommendationUndoAndStartsItsQueueOperation() async {
        let session = SessionStore(authorizationProvider: nil)
        let drinks = SaveQueueStore(api: nil, sessionStore: session, configuration: nil)
        let recommendations = RecommendationQueue(api: nil, window: .seconds(3600))
        let lifecycle = SceneLifecycleHandler(saveQueueStore: drinks, recommendationQueue: recommendations)
        recommendations.delete(id: 4, label: "Amber Lager")

        lifecycle.didEnterBackground()
        await waitUntil { recommendations.entries.first?.status.isFailed == true }

        XCTAssertEqual(recommendations.feedbackSnapshot?.state, .failed("Recommendations are unavailable."))
    }

    func testForegroundExpiresUndoWindowAndFlushesDelete() async {
        let session = SessionStore(authorizationProvider: nil)
        let drinks = SaveQueueStore(
            api: nil,
            sessionStore: session,
            configuration: nil,
            undoWindow: 0,
            sleep: { _ in try await Task.sleep(for: .seconds(3600)) }
        )
        let recommendations = RecommendationQueue(api: nil)
        let lifecycle = SceneLifecycleHandler(saveQueueStore: drinks, recommendationQueue: recommendations)
        _ = drinks.delete(DeleteOperation(label: "Wine", date: "2026-09-26", drinkIDs: [22]))

        await lifecycle.didBecomeActive()
        await waitUntil { if case .failed = drinks.currentFeedback?.status { true } else { false } }

        if case .failed? = drinks.currentFeedback?.status {} else { XCTFail("Expired delete should have been flushed and made retryable") }
        drinks.sessionDidSignOut()
    }

    private func waitUntil(
        _ condition: @escaping @MainActor () -> Bool,
        file: StaticString = #filePath,
        line: UInt = #line
    ) async {
        for _ in 0..<100 {
            if condition() { return }
            try? await Task.sleep(for: .milliseconds(10))
        }
        XCTFail("Condition did not become true", file: file, line: line)
    }
}

private extension RecommendationQueue.Status {
    var isFailed: Bool { if case .failed = self { true } else { false } }
    var undoable: Bool? { if case .undoable = self { true } else { nil } }
}
