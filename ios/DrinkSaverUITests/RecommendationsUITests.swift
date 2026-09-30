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

    func testControlsOrderIsArrowsRenameDeleteAndGripShows() {
        let app = openRecommendations()
        let down = app.buttons["recommendations.move-down.9"]
        let rename = app.buttons["recommendations.rename-button.9"]
        let delete = app.buttons["recommendations.delete.9"]
        XCTAssertTrue(delete.waitForExistence(timeout: 5))
        XCTAssertLessThan(down.frame.maxX, rename.frame.minX + 1)
        XCTAssertLessThan(rename.frame.maxX, delete.frame.minX + 1)
        XCTAssertGreaterThan(delete.frame.maxX, app.frame.maxX - 60)
        // The grip is decorative (accessibility hidden), so check its gutter: the name starts to its right.
        let name = app.staticTexts["recommendations.row.name.9"]
        XCTAssertGreaterThanOrEqual(name.frame.minX, app.frame.minX + 14 + 20, "room left of the name for the grip")
        for b in [down, rename, delete] {
            XCTAssertGreaterThanOrEqual(b.frame.width, 43.9)
            XCTAssertGreaterThanOrEqual(b.frame.height, 43.9)
        }
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

    func testEditActionsAreIconButtonsWithNamesAndTargets() {
        let app = openRecommendations()
        let nameX = app.staticTexts["recommendations.row.name.9"].frame.minX
        app.buttons["recommendations.rename-button.9"].tap()
        XCTAssertEqual(app.textFields["recommendations.rename.9"].frame.minX, nameX, accuracy: 1, "field starts where the name did, no jump")
        for id in ["recommendations.rename-done.9", "recommendations.rename-cancel.9"] {
            let b = app.buttons[id]
            XCTAssertTrue(b.waitForExistence(timeout: 3), id)
            XCTAssertGreaterThanOrEqual(b.frame.width, 43.9)
            XCTAssertGreaterThanOrEqual(b.frame.height, 43.9)
        }
        XCTAssertEqual(app.buttons["recommendations.rename-done.9"].label, "Save name")
        XCTAssertEqual(app.buttons["recommendations.rename-cancel.9"].label, "Cancel name")
        app.buttons["recommendations.rename-cancel.9"].tap()
        XCTAssertTrue(app.buttons["recommendations.rename-button.9"].waitForExistence(timeout: 3))
    }

    func testStartingRenameRaisesKeyboardWithoutTappingTheField() {
        let app = openRecommendations()
        app.buttons["recommendations.rename-button.9"].tap()
        XCTAssertTrue(app.textFields["recommendations.rename.9"].waitForExistence(timeout: 3))
        XCTAssertTrue(app.keyboards.firstMatch.waitForExistence(timeout: 5), "rename should focus its field")
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
