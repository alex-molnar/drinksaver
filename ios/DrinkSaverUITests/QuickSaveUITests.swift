import XCTest

final class QuickSaveUITests: XCTestCase {
    func testQuickShowsRecommendedPlatesAndTrailingAddPlate() {
        let app = launchSignedIn()

        XCTAssertEqual(app.staticTexts["frame.title"].label, "Tonight")
        let first = app.buttons["quick.plate.null-4-6-null"]
        let second = app.buttons["quick.plate.9-3-5-7"]
        let add = app.buttons["quick.plate.add"]
        XCTAssertTrue(first.waitForExistence(timeout: 5))
        XCTAssertTrue(second.exists)
        XCTAssertTrue(add.exists)
        XCTAssertGreaterThanOrEqual(first.frame.height, 150)
        XCTAssertGreaterThanOrEqual(add.frame.height, 150)
        XCTAssertLessThan(first.frame.minY, add.frame.minY)
        XCTAssertEqual(add.label, "Something else")
    }

    func testSavingShowsDoneAndSomethingElseOpensAddSheet() {
        let app = launchSignedIn()
        let first = app.buttons["quick.plate.null-4-6-null"]
        XCTAssertTrue(first.waitForExistence(timeout: 5))
        first.tap()
        XCTAssertTrue(first.waitForExistence(timeout: 3))
        XCTAssertEqual(first.value as? String, "Saved")
        let undo = app.buttons["quick.queue.undo"]
        XCTAssertTrue(undo.waitForExistence(timeout: 3))
        undo.tap()
        XCTAssertFalse(undo.waitForExistence(timeout: 1))

        app.buttons["quick.plate.add"].tap()
        XCTAssertTrue(app.otherElements["frame.add-sheet"].waitForExistence(timeout: 3))
    }

    func testFailedSaveExposesRetryAction() {
        let app = launchSignedIn(fixture: "signed-in-save-failure")
        let first = app.buttons["quick.plate.null-4-6-null"]
        XCTAssertTrue(first.waitForExistence(timeout: 5))
        first.tap()

        let retry = app.buttons["quick.queue.retry"]
        XCTAssertTrue(retry.waitForExistence(timeout: 5))
        retry.tap()
        XCTAssertTrue(retry.waitForExistence(timeout: 5))
        XCTAssertTrue(app.staticTexts["quick.queue.message"].exists)
    }

    private func launchSignedIn(fixture: String = "signed-in") -> XCUIApplication {
        let app = XCUIApplication()
        app.launchArguments = [
            "-ui-fixture", fixture,
            "-ui-fixed-now", "2026-01-02T03:04:05Z",
            "-ui-locale", "en-US",
            "-ui-content-size", "large",
            "-ui-reduce-motion", "true"
        ]
        app.launch()
        return app
    }
}
