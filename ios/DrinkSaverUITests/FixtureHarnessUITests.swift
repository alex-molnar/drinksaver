import XCTest

final class FixtureHarnessUITests: XCTestCase {
    func testSignedInFixtureLaunchesWithDeterministicState() {
        let app = XCUIApplication()
        app.launchArguments = [
            "-ui-fixture", "signed-in",
            "-ui-fixed-now", "2026-01-02T03:04:05Z",
            "-ui-locale", "en-US",
            "-ui-content-size", "large",
            "-ui-reduce-motion", "true"
        ]
        app.launch()

        XCTAssertTrue(app.staticTexts["frame.title"].waitForExistence(timeout: 5))
        XCTAssertEqual(app.staticTexts["frame.title"].label, "Tonight")
    }
}
