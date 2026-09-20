import XCTest

final class ProjectSmokeUITests: XCTestCase {

    let app = XCUIApplication()

    override func setUpWithError() throws {
        continueAfterFailure = false
        app.launch()
    }

    func testAppLaunches() throws {
        // Verify the app launches and the root element exists
        let rootElement = app.otherElements["app.root"]
        XCTAssertTrue(rootElement.waitForExistence(timeout: 5), "Root element with accessibility identifier 'app.root' should exist")
    }
}