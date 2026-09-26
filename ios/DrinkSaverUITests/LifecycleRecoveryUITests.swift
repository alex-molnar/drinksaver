import XCTest

@MainActor
final class LifecycleRecoveryUITests: XCTestCase {
    func testRecommendationFeedbackMovesAcrossTabsIntoAddSheetAndUndoRoutesBack() {
        let app = XCUIApplication()
        app.launchArguments = [
            "-ui-fixture", "signed-in",
            "-ui-fixed-now", "2026-09-26T12:00:00Z",
            "-ui-locale", "en-GB",
            "-ui-content-size", "large",
            "-ui-reduce-motion", "true",
            "-ui-feedback-window-long"
        ]
        app.launch()
        app.buttons["frame.menu"].tap()
        app.buttons["Recommendations"].tap()

        let row = app.staticTexts["recommendations.row.name.9"]
        XCTAssertTrue(row.waitForExistence(timeout: 5))
        app.buttons["recommendations.delete.9"].tap()
        XCTAssertTrue(app.staticTexts["frame.queue.message"].waitForExistence(timeout: 3))

        app.buttons["frame.tab.quick"].tap()
        XCTAssertTrue(app.staticTexts["quick.queue.message"].waitForExistence(timeout: 3))
        app.buttons["frame.tab.add"].tap()
        let undo = app.buttons["frame.add.feedback.undo"]
        XCTAssertTrue(undo.waitForExistence(timeout: 3))
        undo.tap()
        XCTAssertTrue(undo.waitForNonExistence(timeout: 3))

        app.buttons["frame.add.close"].tap()
        app.buttons["frame.menu"].tap()
        app.buttons["Recommendations"].tap()
        XCTAssertTrue(row.waitForExistence(timeout: 3))
    }
}
