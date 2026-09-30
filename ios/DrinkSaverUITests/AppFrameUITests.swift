import XCTest

final class AppFrameUITests: XCTestCase {
    func testAuthenticatedFrameNavigationAndMenu() {
        let app = launchSignedIn()
        XCTAssertTrue(app.staticTexts["frame.title"].waitForExistence(timeout: 5))
        XCTAssertEqual(app.staticTexts["frame.title"].label, "Tonight")
        XCTAssertTrue(app.staticTexts["frame.subtitle"].waitForExistence(timeout: 5))
        XCTAssertEqual(app.staticTexts["frame.subtitle"].label, "2 so far")
        XCTAssertEqual(app.tabBars.count, 0)
        XCTAssertEqual(app.navigationBars.count, 0)

        let quick = app.buttons["frame.tab.quick"]
        let add = app.buttons["frame.tab.add"]
        let history = app.buttons["frame.tab.history"]
        XCTAssertTrue(quick.exists)
        XCTAssertTrue(add.exists)
        XCTAssertTrue(history.exists)
        XCTAssertGreaterThanOrEqual(quick.frame.height, 44)
        XCTAssertEqual(quick.value as? String, "Selected")

        history.tap()
        XCTAssertEqual(app.staticTexts["frame.title"].label, "History")
        add.tap()
        XCTAssertTrue(app.otherElements["frame.add-sheet"].waitForExistence(timeout: 3))
        app.buttons["frame.add.close"].tap()
        XCTAssertEqual(app.staticTexts["frame.title"].label, "History")

        app.buttons["frame.menu"].tap()
        XCTAssertTrue(app.buttons["Recommendations"].exists)
        XCTAssertTrue(app.buttons["Add new type"].exists)
        XCTAssertTrue(app.buttons["Logout"].exists)
        let appearance = app.buttons["frame.theme.toggle"]
        XCTAssertGreaterThanOrEqual(appearance.frame.height, 44)
        XCTAssertEqual(appearance.value as? String, "Dark")
        appearance.tap()
        XCTAssertEqual(appearance.value as? String, "Light")
        appearance.tap()
        XCTAssertEqual(appearance.value as? String, "Dark")
        app.buttons["Recommendations"].tap()
        XCTAssertEqual(app.staticTexts["frame.title"].label, "Recommendations")
    }

    func testAddNewTypeStartsAtCreatePanelAndLogoutReturnsToGate() {
        let app = launchSignedIn()
        app.buttons["frame.menu"].tap()
        app.buttons["Add new type"].tap()
        XCTAssertTrue(app.staticTexts["frame.add.create.alcoholType"].waitForExistence(timeout: 3))
        app.buttons["frame.add.close"].tap()
        app.buttons["frame.menu"].tap()
        app.buttons["Recommendations"].tap()
        app.buttons["frame.menu"].tap()
        app.buttons["Logout"].tap()
        XCTAssertTrue(app.buttons["Sign in"].waitForExistence(timeout: 5))
        XCTAssertFalse(app.buttons["frame.tab.quick"].exists)
        app.buttons["Sign in"].tap()
        XCTAssertTrue(app.staticTexts["frame.title"].waitForExistence(timeout: 5))
        XCTAssertEqual(app.staticTexts["frame.title"].label, "Tonight")
        XCTAssertEqual(app.buttons["frame.tab.quick"].value as? String, "Selected")
    }

    func testAddDrinkSelectionPersistsAcrossNestedPanelsAndResetsForNewSheet() {
        let app = launchSignedIn()
        app.buttons["frame.tab.add"].tap()
        app.buttons["Drink, Choose"].tap()
        let wine = app.buttons["Wine"]
        XCTAssertTrue(wine.waitForExistence(timeout: 3))
        wine.tap()
        app.buttons["Size, Choose"].tap()
        let glass = app.buttons.matching(NSPredicate(format: "label CONTAINS 'Glass'")).firstMatch
        XCTAssertTrue(glass.waitForExistence(timeout: 3))
        glass.tap()
        XCTAssertTrue(app.buttons["Size, Glass (0.25L)"].exists)
        app.buttons["frame.add.close"].tap()
        app.buttons["frame.tab.add"].tap()
        XCTAssertTrue(app.buttons["Drink, Choose"].waitForExistence(timeout: 3))
    }

    func testAddDrinkHandsSaveToQueue() {
        let app = launchSignedIn()
        app.buttons["frame.tab.add"].tap()
        app.buttons["Drink, Choose"].tap()
        app.buttons["Wine"].tap()
        app.buttons["Size, Choose"].tap()
        app.buttons.matching(NSPredicate(format: "label CONTAINS 'Glass'")).firstMatch.tap()
        app.buttons["add.save"].tap()
        XCTAssertTrue(app.staticTexts["frame.subtitle"].waitForExistence(timeout: 5))
    }

    func testAddSaveFromHistoryKeepsUndoReachable() {
        let app = launchSignedIn()
        app.buttons["frame.tab.history"].tap()
        app.buttons["frame.tab.add"].tap()
        app.buttons["Drink, Choose"].tap()
        app.buttons["Wine"].tap()
        app.buttons["Size, Choose"].tap()
        app.buttons.matching(NSPredicate(format: "label CONTAINS 'Glass'")).firstMatch.tap()
        app.buttons["add.save"].tap()
        let undo = app.buttons["frame.queue.undo"]
        XCTAssertTrue(undo.waitForExistence(timeout: 5))
        undo.tap()
    }

    func testAddSaveStaysHittableWhileToastShowsInSheet() {
        assertSaveHittableWithToast(contentSize: "large")
    }

    func testAddSaveStaysHittableWithToastAtAccessibilityTextSize() {
        assertSaveHittableWithToast(contentSize: "accessibility3")
    }

    private func assertSaveHittableWithToast(contentSize: String) {
        let app = launchSignedIn(contentSize: contentSize)
        app.buttons["frame.tab.add"].tap()
        app.buttons["Drink, Choose"].tap()
        app.buttons["Wine"].tap()
        app.buttons["Size, Choose"].tap()
        app.buttons.matching(NSPredicate(format: "label CONTAINS 'Glass'")).firstMatch.tap()
        app.buttons["add.save"].tap()
        XCTAssertTrue(app.buttons["quick.queue.undo"].waitForExistence(timeout: 5))
        app.buttons["frame.tab.add"].tap()
        app.buttons["Drink, Choose"].tap()
        app.buttons["Wine"].tap()
        app.buttons["Size, Choose"].tap()
        app.buttons.matching(NSPredicate(format: "label CONTAINS 'Glass'")).firstMatch.tap()
        let message = app.staticTexts["frame.add.feedback.message"]
        XCTAssertTrue(message.waitForExistence(timeout: 3))
        let save = app.buttons["add.save"]
        XCTAssertTrue(save.isHittable)
        XCTAssertFalse(save.frame.intersects(message.frame))
    }

    private func launchSignedIn(contentSize: String = "large", fixture: String = "signed-in") -> XCUIApplication {
        let app = XCUIApplication()
        app.launchArguments = [
            "-ui-fixture", fixture,
            "-ui-fixed-now", "2026-01-02T03:04:05Z",
            "-ui-locale", "en-US",
            "-ui-content-size", contentSize,
            "-ui-reduce-motion", "true"
        ]
        app.launch()
        return app
    }
}
