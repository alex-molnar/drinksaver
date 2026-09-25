import Foundation
import XCTest
@testable import DrinkSaver

final class AppConfigurationTests: XCTestCase {
    private var temporaryBundles: [URL] = []

    func testLocalConfigurationAndLocalhostATSFixture() throws {
        let values = try fixture("Local")
        let config = try AppConfiguration.load(bundle: bundle(with: values))

        XCTAssertEqual(config.environment, .local)
        XCTAssertEqual(config.apiBaseURL.absoluteString, "http://localhost:8080")
        XCTAssertEqual(config.issuerURL.absoluteString, "http://localhost:8081/auth/realms/drinksaver")
        XCTAssertEqual(config.clientID, "drinksaver-ios-local")
        XCTAssertEqual(config.redirectURL.absoluteString, "im.kak.drinksaver:/oauth2redirect")
        let ats = try XCTUnwrap(values["NSAppTransportSecurity"] as? [String: Any])
        let domains = try XCTUnwrap(ats["NSExceptionDomains"] as? [String: Any])
        XCTAssertEqual(Set(domains.keys), ["localhost"])
    }

    func testTestConfiguration() throws {
        let values = try fixture("Test")
        let config = try AppConfiguration.load(bundle: bundle(with: values))

        XCTAssertEqual(config.environment, .test)
        XCTAssertEqual(config.apiBaseURL.absoluteString, "https://test.api.drinksaver.kak.im")
        XCTAssertEqual(config.issuerURL.absoluteString, "https://auth.drinksaver.kak.im/auth/realms/test-drinksaver")
        XCTAssertEqual(config.clientID, "drinksaver-ios-test")
        XCTAssertEqual(config.redirectURL.absoluteString, "im.kak.drinksaver:/oauth2redirect")
        XCTAssertNil(values["NSAppTransportSecurity"])
    }

    func testReleaseConfigurationAndNoATSException() throws {
        let values = try fixture("Release")
        let config = try AppConfiguration.load(bundle: bundle(with: values))

        XCTAssertEqual(config.environment, .production)
        XCTAssertEqual(config.apiBaseURL.absoluteString, "https://api.drinksaver.kak.im")
        XCTAssertEqual(config.issuerURL.absoluteString, "https://auth.drinksaver.kak.im/auth/realms/drinksaver")
        XCTAssertEqual(config.clientID, "drinksaver-ios")
        XCTAssertEqual(config.redirectURL.absoluteString, "im.kak.drinksaver:/oauth2redirect")
        XCTAssertNil(values["NSAppTransportSecurity"])
    }

    func testRejectsUnapprovedReleaseEndpoint() throws {
        let invalidEndpoints = [
            ("API_BASE_URL", "http://api.drinksaver.kak.im"),
            ("API_BASE_URL", "https://other.drinksaver.kak.im"),
            ("API_BASE_URL", "https://api.drinksaver.kak.im:8443"),
            ("API_BASE_URL", "https://api.drinksaver.kak.im/v1"),
            ("OIDC_ISSUER_URL", "http://auth.drinksaver.kak.im/auth/realms/drinksaver"),
            ("OIDC_ISSUER_URL", "https://auth.drinksaver.kak.im:8443/auth/realms/drinksaver"),
            ("OIDC_ISSUER_URL", "https://auth.drinksaver.kak.im/auth/realms/other"),
        ]

        for (key, invalidValue) in invalidEndpoints {
            var values = try fixture("Release")
            values[key] = invalidValue
            XCTAssertThrowsError(try AppConfiguration.load(bundle: bundle(with: values)), "accepted \(invalidValue)")
        }
    }

    func testMissingValueReportsItsInfoPlistKey() throws {
        var values = try fixture("Release")
        values.removeValue(forKey: "OIDC_CLIENT_ID")

        XCTAssertThrowsError(try AppConfiguration.load(bundle: bundle(with: values))) { error in
            XCTAssertEqual(error as? AppConfiguration.ConfigurationError, .missing(key: "OIDC_CLIENT_ID"))
        }
    }

    override func tearDownWithError() throws {
        for directory in temporaryBundles {
            try FileManager.default.removeItem(at: directory)
        }
        temporaryBundles.removeAll()
        try super.tearDownWithError()
    }

    private func fixture(_ name: String) throws -> [String: Any] {
        let url = try XCTUnwrap(Bundle(for: Self.self).url(forResource: name, withExtension: "plist"))
        return try XCTUnwrap(NSDictionary(contentsOf: url) as? [String: Any])
    }

    private func bundle(with values: [String: Any]) throws -> Bundle {
        let directory = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString + ".bundle")
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        temporaryBundles.append(directory)
        let info = directory.appendingPathComponent("Info.plist")
        let data = try PropertyListSerialization.data(fromPropertyList: values, format: .xml, options: 0)
        try data.write(to: info)
        return try XCTUnwrap(Bundle(url: directory))
    }
}
