import XCTest
@testable import DrinkSaver

final class UITestFixtureTests: XCTestCase {
    func testPartialFixtureArgumentsFailParsing() {
        XCTAssertThrowsError(try UITestFixture.parse(arguments: ["DrinkSaver", "-ui-locale", "en-US"]))
    }

    func testNormalLaunchArgumentsDoNotSelectFixture() throws {
        XCTAssertNil(try UITestFixture.parse(arguments: ["DrinkSaver"]))
    }
}
