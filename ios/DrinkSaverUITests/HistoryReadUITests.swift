import XCTest

final class HistoryReadUITests: XCTestCase {
    func testHistoryShowsSevenDayStripAndLoadedPaperRows() {
        let app = XCUIApplication()
        app.launchArguments = [
            "-ui-fixture", "signed-in",
            "-ui-fixed-now", "2026-01-02T18:04:05Z",
            "-ui-locale", "en-US",
            "-ui-content-size", "large",
            "-ui-reduce-motion", "true"
        ]
        app.launch()
        app.buttons["frame.tab.history"].tap()

        XCTAssertEqual(app.staticTexts["frame.title"].label, "History")
        XCTAssertTrue(app.buttons["history.calendar"].exists)
        XCTAssertTrue(app.buttons["history.day.2026-01-02"].exists)
        XCTAssertTrue(app.staticTexts["Fixture drink one"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.staticTexts["Fixture drink two"].exists)
        XCTAssertTrue(app.staticTexts["history.count"].exists)
    }

    func testCrossOffShowsUndoAndRestoresDrink() {
        let app = XCUIApplication()
        app.launchArguments = [
            "-ui-fixture", "signed-in",
            "-ui-fixed-now", "2026-01-02T18:04:05Z",
            "-ui-locale", "en-US",
            "-ui-content-size", "large",
            "-ui-reduce-motion", "true"
        ]
        app.launch()
        app.buttons["frame.tab.history"].tap()

        let drink = app.staticTexts["Fixture drink one"]
        XCTAssertTrue(drink.waitForExistence(timeout: 5))
        app.buttons["Cross off Fixture drink one"].tap()
        let undo = app.buttons["frame.queue.undo"]
        XCTAssertTrue(undo.waitForExistence(timeout: 3))
        undo.tap()
        XCTAssertTrue(drink.waitForExistence(timeout: 3))
    }
}
