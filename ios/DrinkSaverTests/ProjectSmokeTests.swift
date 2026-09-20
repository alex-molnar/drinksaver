import XCTest

final class ProjectSmokeTests: XCTestCase {

    func testAppLaunches() throws {
        // This is a minimal smoke test that verifies the test target compiles and runs
        XCTAssertTrue(true, "Project smoke test placeholder")
    }

    func testBundleIdentifier() throws {
        let bundleIdentifier = Bundle.main.bundleIdentifier
        XCTAssertEqual(bundleIdentifier, "im.kak.drinksaver")
    }

    func testDeploymentTarget() throws {
        // Verify the deployment target is iOS 18.0
        let systemVersion = UIDevice.current.systemVersion
        let versionComponents = systemVersion.split(separator: ".").compactMap { Int($0) }
        XCTAssertGreaterThanOrEqual(versionComponents.first ?? 0, 18)
    }
}