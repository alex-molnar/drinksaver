import XCTest

final class ProjectSmokeUITests: XCTestCase {
    func testAppLaunches() {
        let app = XCUIApplication()
        app.launch()

        XCTAssertTrue(app.descendants(matching: .any)["app.root"].waitForExistence(timeout: 5))
    }
}
