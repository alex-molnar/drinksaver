import XCTest

final class AppFrameUITests: XCTestCase {
    func testAddSaveIsDisabledUntilDrinkAndSizeChosen() {
        let app = launchSignedIn()
        app.buttons["frame.tab.add"].tap()
        let save = app.buttons["add.save"]
        XCTAssertTrue(save.waitForExistence(timeout: 5))
        XCTAssertFalse(save.isEnabled)
        app.buttons["Drink, Choose"].tap()
        app.buttons["Wine"].tap()
        XCTAssertFalse(save.isEnabled)
        app.buttons["Size, Choose"].tap()
        app.buttons.matching(NSPredicate(format: "label CONTAINS 'Glass'")).firstMatch.tap()
        XCTAssertTrue(save.waitForExistence(timeout: 3))
        XCTAssertTrue(save.isEnabled)
    }

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
        dismissAddSheet(app)
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
        dismissAddSheet(app)
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
        dismissAddSheet(app)
        app.buttons["frame.tab.add"].tap()
        XCTAssertTrue(app.buttons["Drink, Choose"].waitForExistence(timeout: 3))
    }

    func testYesterdayCanBeChosenForTheDrink() {
        let app = launchSignedIn()
        app.buttons["frame.tab.add"].tap()
        app.buttons["When, Today"].tap()
        app.buttons["add.date.yesterday"].tap()
        XCTAssertTrue(app.buttons["When, Yesterday"].waitForExistence(timeout: 3))
    }

    func testSetDateIsDisabledUntilADateIsPicked() {
        let app = launchSignedIn()
        app.buttons["frame.tab.add"].tap()
        app.buttons["When, Today"].tap()
        app.buttons["add.date.another"].tap()
        XCTAssertTrue(app.buttons["add.date.set"].waitForExistence(timeout: 3))
        XCTAssertFalse(app.buttons["add.date.set"].isEnabled)
    }

    func testAddSheetHasNoCloseButtonAndOptionPanelPlusOpensCreate() {
        let app = launchSignedIn()
        app.buttons["frame.tab.add"].tap()
        XCTAssertTrue(app.buttons["Drink, Choose"].waitForExistence(timeout: 3))
        XCTAssertFalse(app.buttons["frame.add.close"].exists)
        XCTAssertFalse(app.buttons["frame.add.new"].exists)
        app.buttons["Drink, Choose"].tap()
        app.buttons["Wine"].tap()
        app.buttons["Size, Choose"].tap()
        let plus = app.buttons["frame.add.new"]
        XCTAssertTrue(plus.waitForExistence(timeout: 3))
        XCTAssertEqual(plus.label, "Add size")
        plus.tap()
        XCTAssertTrue(app.textFields["add.create.name"].waitForExistence(timeout: 3))
    }

    func testSizeAndSubtypeRowsAppearOnlyOnceADrinkIsChosen() {
        let app = launchSignedIn()
        app.buttons["frame.tab.add"].tap()
        XCTAssertTrue(app.buttons["Drink, Choose"].waitForExistence(timeout: 3))
        XCTAssertFalse(app.buttons["Size, Choose"].exists)
        XCTAssertFalse(app.buttons["Subtype, Choose"].exists)
        app.buttons["Drink, Choose"].tap()
        app.buttons["Wine"].tap()
        XCTAssertTrue(app.buttons["Subtype, Choose"].waitForExistence(timeout: 3))
        XCTAssertTrue(app.buttons["Size, Choose"].exists)
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

    func testDateRowsAreTappableAcrossTheirWholeWidth() {
        let app = launchSignedIn()
        app.buttons["frame.tab.add"].tap()
        // Measure at full height: at the half detent newer OSes draw the sheet scaled (about 0.96), which shrinks every frame.
        app.otherElements["frame.add-sheet"].swipeUp(velocity: .fast)
        app.buttons["When, Today"].tap()
        let row = app.buttons["add.date.yesterday"]
        XCTAssertTrue(row.waitForExistence(timeout: 3))
        XCTAssertGreaterThanOrEqual(row.frame.height, 47)
        XCTAssertGreaterThan(row.frame.width, 300)
        row.coordinate(withNormalizedOffset: CGVector(dx: 0.9, dy: 0.5)).tap()
        XCTAssertTrue(app.buttons["When, Yesterday"].waitForExistence(timeout: 3))
    }

    func testHeaderPlusAndBackAreTappableAtTheCornersOfTheirBox() {
        let app = launchSignedIn()
        app.buttons["frame.tab.add"].tap()
        // Full height, so the measured frames are not scaled by the half detent presentation on newer OSes.
        app.otherElements["frame.add-sheet"].swipeUp(velocity: .fast)
        app.buttons["Drink, Choose"].tap()
        app.buttons["Wine"].tap()
        app.buttons["Size, Choose"].tap()
        let plus = app.buttons["frame.add.new"]
        XCTAssertTrue(plus.waitForExistence(timeout: 3))
        XCTAssertGreaterThanOrEqual(plus.frame.width, 43)
        XCTAssertGreaterThanOrEqual(plus.frame.height, 43)
        plus.coordinate(withNormalizedOffset: CGVector(dx: 0.9, dy: 0.9)).tap()
        XCTAssertTrue(app.textFields["add.create.name"].waitForExistence(timeout: 3))
        let back = app.buttons["frame.add.back"]
        XCTAssertGreaterThanOrEqual(back.frame.width, 43)
        XCTAssertGreaterThanOrEqual(back.frame.height, 43)
        back.coordinate(withNormalizedOffset: CGVector(dx: 0.1, dy: 0.9)).tap()
        XCTAssertTrue(plus.waitForExistence(timeout: 3))
        back.coordinate(withNormalizedOffset: CGVector(dx: 0.1, dy: 0.9)).tap()
        XCTAssertTrue(app.buttons["Size, Choose"].waitForExistence(timeout: 3))
    }

    /// Swipes the sheet down and waits until it is really gone, so later assertions run on the screen underneath.
    private func dismissAddSheet(_ app: XCUIApplication, file: StaticString = #filePath, line: UInt = #line) {
        let sheet = app.otherElements["frame.add-sheet"]
        sheet.swipeDown(velocity: .fast)
        let gone = XCTNSPredicateExpectation(predicate: NSPredicate(format: "exists == false"), object: sheet)
        XCTAssertEqual(XCTWaiter().wait(for: [gone], timeout: 5), .completed, "Add sheet should dismiss", file: file, line: line)
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
