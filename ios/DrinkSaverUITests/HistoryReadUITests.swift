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

    func testTappingRightSideOfRowSelectsIt() {
        let app = launchHistory()

        let drink = app.staticTexts["Fixture drink one"]
        XCTAssertTrue(drink.waitForExistence(timeout: 5))
        // The name label spans the free width of the row, so its far edge is the row's right side.
        drink.coordinate(withNormalizedOffset: CGVector(dx: 0.95, dy: 0.5)).tap()
        XCTAssertTrue(app.buttons["history.cross-off.selected"].waitForExistence(timeout: 3))
        XCTAssertTrue(app.buttons["Deselect Fixture drink one"].exists)
    }

    func testTappingCheckboxTogglesSelectionExactlyOnce() {
        let app = launchHistory()
        let checkbox = app.buttons["Select Fixture drink one"]
        XCTAssertTrue(checkbox.waitForExistence(timeout: 5))
        checkbox.tap()
        XCTAssertTrue(app.buttons["Deselect Fixture drink one"].waitForExistence(timeout: 3), "a double toggle would leave it unselected")
        XCTAssertTrue(app.buttons["history.cross-off.selected"].exists)
    }

    func testCrossOffButtonDoesNotAlsoToggleSelection() {
        let app = launchHistory()
        let crossOff = app.buttons["Cross off Fixture drink one"]
        XCTAssertTrue(crossOff.waitForExistence(timeout: 5))
        crossOff.tap()
        XCTAssertTrue(app.buttons["frame.queue.undo"].waitForExistence(timeout: 3))
        XCTAssertFalse(app.buttons["history.cross-off.selected"].exists, "cross-off must not select the row")
        XCTAssertFalse(app.buttons["Deselect Fixture drink one"].exists)
    }

    private func launchHistory() -> XCUIApplication {
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
        return app
    }
}
