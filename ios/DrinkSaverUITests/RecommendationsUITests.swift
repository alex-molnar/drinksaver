import XCTest

@MainActor
final class RecommendationsUITests: XCTestCase {
    func testShowsOnlyPersistedPersonalRecommendations() {
        let app = openRecommendations()
        XCTAssertEqual(app.staticTexts["frame.title"].label, "Recommendations")
        XCTAssertEqual(app.staticTexts["recommendations.count"].label, "2 saved")
        XCTAssertTrue(app.staticTexts["recommendations.row.name.9"].exists)
        XCTAssertTrue(app.staticTexts["recommendations.row.name.10"].exists)
        XCTAssertFalse(app.staticTexts["Golden lager"].exists)
    }

    func testMoveButtonsAreAccessibleAndCancelRestoresOrder() {
        let app = openRecommendations()
        let house = app.staticTexts["recommendations.row.name.9"]
        let amber = app.staticTexts["recommendations.row.name.10"]
        XCTAssertTrue(house.waitForExistence(timeout: 5))
        XCTAssertLessThan(house.frame.minY, amber.frame.minY)

        app.buttons["recommendations.move-down.9"].tap()
        XCTAssertGreaterThan(house.frame.minY, amber.frame.minY)
        XCTAssertTrue(app.buttons["recommendations.save"].exists)
        app.buttons["recommendations.cancel"].tap()
        XCTAssertLessThan(house.frame.minY, amber.frame.minY)
    }

    func testRenameSaveCommitsAndReturnsToQuick() {
        let app = openRecommendations()
        app.buttons["recommendations.rename-button.9"].tap()
        let field = app.textFields["recommendations.rename.9"]
        XCTAssertTrue(field.waitForExistence(timeout: 3))
        let original = field.value as? String ?? "House pilsner"
        field.tap()
        field.typeText(String(repeating: XCUIKeyboardKey.delete.rawValue, count: original.count) + "New house")
        app.buttons["Save name"].tap()
        app.buttons["recommendations.save"].tap()

        let quick = app.buttons["frame.tab.quick"]
        XCTAssertTrue(quick.waitForExistence(timeout: 5))
        let selected = NSPredicate(format: "value == 'Selected'")
        expectation(for: selected, evaluatedWith: quick)
        waitForExpectations(timeout: 5)
    }

    func testCrossOffCanBeUndone() {
        let app = openRecommendations()
        let house = app.staticTexts["recommendations.row.name.9"]
        XCTAssertTrue(house.waitForExistence(timeout: 5))
        app.buttons["recommendations.delete.9"].tap()
        let undo = app.buttons["frame.queue.undo"]
        XCTAssertTrue(undo.waitForExistence(timeout: 3))
        undo.tap()
        XCTAssertTrue(house.waitForExistence(timeout: 3))
    }

    func testLoadFailureCanRetry() {
        let app = openRecommendations(fixture: "signed-in-api-failure")
        let retry = app.buttons["recommendations.retry"]
        XCTAssertTrue(retry.waitForExistence(timeout: 5))
        retry.tap()
        XCTAssertTrue(retry.waitForExistence(timeout: 3))
    }

    private func openRecommendations(fixture: String = "signed-in") -> XCUIApplication {
        let app = XCUIApplication()
        app.launchArguments = [
            "-ui-fixture", fixture,
            "-ui-fixed-now", "2026-01-02T18:04:05Z",
            "-ui-locale", "en-US",
            "-ui-content-size", "large",
            "-ui-reduce-motion", "true"
        ]
        app.launch()
        app.buttons["frame.menu"].tap()
        app.buttons["Recommendations"].tap()
        return app
    }
}
