import XCTest

@MainActor
final class AccessibilityUITests: XCTestCase {
    func testNavigationAndPrimaryControlsHaveNamesValuesAndFortyFourPointTargets() {
        let app = launchSignedIn()
        XCTAssertTrue(app.staticTexts["frame.title"].waitForExistence(timeout: 5))

        let quick = app.buttons["frame.tab.quick"]
        let add = app.buttons["frame.tab.add"]
        let history = app.buttons["frame.tab.history"]
        let menu = app.buttons["frame.menu"]
        for control in [quick, add, history, menu] {
            XCTAssertTrue(control.exists)
            XCTAssertFalse(control.label.isEmpty)
            assertMinimumTarget(control)
        }
        XCTAssertEqual(quick.value as? String, "Selected")
        XCTAssertEqual(history.value as? String, "Not selected")
        XCTAssertEqual(add.value as? String, "Opens Add")

        app.buttons["quick.plate.null-4-6-null"].tap()
        let undo = app.buttons["quick.queue.undo"]
        XCTAssertTrue(undo.waitForExistence(timeout: 3))
        XCTAssertFalse(undo.label.isEmpty)
        assertMinimumTarget(undo)
    }

    func testHistoryAndRecommendationActionsHaveAccessibleNamesAndTargets() {
        let app = launchSignedIn()
        app.buttons["frame.tab.history"].tap()
        let day = app.buttons["history.day.2026-01-02"]
        let datePicker = app.buttons["history.calendar"]
        XCTAssertTrue(day.waitForExistence(timeout: 5))
        XCTAssertTrue(day.label.contains("Friday"))
        XCTAssertEqual(day.value as? String, "Selected")
        assertMinimumTarget(datePicker)

        app.buttons["frame.menu"].tap()
        app.buttons["Recommendations"].tap()
        let rename = app.buttons["recommendations.rename-button.9"]
        let delete = app.buttons["recommendations.delete.9"]
        let move = app.buttons["recommendations.move-down.9"]
        for control in [rename, delete, move] {
            XCTAssertTrue(control.waitForExistence(timeout: 3))
            XCTAssertFalse(control.label.isEmpty)
        }
        assertMinimumTarget(delete)
        assertMinimumTarget(move)
    }

    func testAccessibilityDynamicTypeKeepsNavigationVisibleAndKeyboardContentReachable() {
        let app = launchSignedIn(contentSize: "accessibility5")
        let title = app.staticTexts["frame.title"]
        let menu = app.buttons["frame.menu"]
        XCTAssertTrue(title.waitForExistence(timeout: 5))
        XCTAssertTrue(menu.exists)
        XCTAssertTrue(title.isHittable)
        XCTAssertTrue(menu.isHittable)
        XCTAssertLessThanOrEqual(title.frame.maxX, menu.frame.minX)

        app.buttons["frame.tab.add"].tap()
        let notes = app.textFields["Notes"]
        XCTAssertTrue(notes.waitForExistence(timeout: 5))
        notes.tap()
        XCTAssertTrue(app.keyboards.firstMatch.waitForExistence(timeout: 3))
        XCTAssertTrue(notes.isHittable)
        XCTAssertTrue(app.buttons["add.save"].isHittable)
    }

    func testAppleAccessibilityAudit() throws {
        let app = launchSignedIn()
        XCTAssertTrue(app.staticTexts["frame.title"].waitForExistence(timeout: 5))
        try app.performAccessibilityAudit(for: .all.subtracting(.dynamicType))
    }

    private func launchSignedIn(contentSize: String = "large") -> XCUIApplication {
        let app = XCUIApplication()
        app.launchArguments = [
            "-ui-fixture", "signed-in",
            "-ui-fixed-now", "2026-01-02T18:04:05Z",
            "-ui-locale", "en-US",
            "-ui-content-size", contentSize,
            "-ui-reduce-motion", "true"
        ]
        app.launch()
        return app
    }

    private func assertMinimumTarget(_ control: XCUIElement, file: StaticString = #filePath, line: UInt = #line) {
        XCTAssertGreaterThanOrEqual(control.frame.width, 43.5, "\(control.identifier) frame: \(control.frame)", file: file, line: line)
        XCTAssertGreaterThanOrEqual(control.frame.height, 43.5, "\(control.identifier) frame: \(control.frame)", file: file, line: line)
    }
}
