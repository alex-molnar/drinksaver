import XCTest
@testable import DrinkSaver

final class ProjectSmokeTests: XCTestCase {
    func testRootViewInstantiates() {
        XCTAssertNoThrow(RootView())
    }
}
