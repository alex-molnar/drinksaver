import AppAuth
import Foundation
import XCTest
@testable import DrinkSaver

@MainActor
final class AppAuthClientTests: XCTestCase {
    func testSignInBuildsPublicPKCERequestAndPersistsAuthorization() async throws {
        let store = AuthorizationStateMemoryStore()
        let driver = FakeAppAuthDriver(state: try makeAuthorizedState())
        let client = AppAuthClient(configuration: testConfiguration, store: store, driver: driver)

        try await client.signIn()

        let request = try XCTUnwrap(driver.authorizationRequest)
        XCTAssertEqual(request.clientID, "drinksaver-ios-test")
        XCTAssertNil(request.clientSecret)
        XCTAssertEqual(Set(request.scope?.split(separator: " ").map(String.init) ?? []), ["openid", "profile", "offline_access"])
        XCTAssertEqual(request.redirectURL, testConfiguration.redirectURL)
        XCTAssertEqual(request.responseType, OIDResponseTypeCode)
        XCTAssertEqual(request.codeChallengeMethod, "S256")
        XCTAssertFalse(try XCTUnwrap(request.codeVerifier).isEmpty)
        XCTAssertEqual(client.subject, "user-123")
        XCTAssertNotNil(store.data)
        XCTAssertTrue(store.requiresSecureCoding)
    }

    func testRestoreSecurelyUnarchivesAuthorizationState() async throws {
        let state = try makeAuthorizedState()
        let store = AuthorizationStateMemoryStore(data: try NSKeyedArchiver.archivedData(withRootObject: state, requiringSecureCoding: true))
        let client = AppAuthClient(configuration: testConfiguration, store: store, driver: FakeAppAuthDriver())

        let restored = try await client.restore()
        XCTAssertTrue(restored)
        XCTAssertEqual(client.subject, "user-123")
    }

    func testAuthorizationCancellationUsesTheSignedOutOutcome() async throws {
        let driver = FakeAppAuthDriver(state: try makeAuthorizedState())
        driver.authorizationError = NSError(domain: OIDGeneralErrorDomain, code: -3)
        let client = AppAuthClient(configuration: testConfiguration, store: AuthorizationStateMemoryStore(), driver: driver)

        do {
            try await client.signIn()
            XCTFail("Expected authorization cancellation")
        } catch {
            XCTAssertEqual(error as? AuthorizationFailure, .cancelled)
        }
    }

    func testCorruptOrLegacyArchiveIsClearedAndRestoresSignedOut() async throws {
        let legacyArchiver = NSKeyedArchiver(requiringSecureCoding: false)
        legacyArchiver.encode(["legacy": "value"], forKey: NSKeyedArchiveRootObjectKey)
        legacyArchiver.finishEncoding()
        for data in [Data([0, 1, 2]), legacyArchiver.encodedData] {
            let store = AuthorizationStateMemoryStore(data: data)
            let client = AppAuthClient(configuration: testConfiguration, store: store, driver: FakeAppAuthDriver())

            let restored = try await client.restore()
            XCTAssertFalse(restored)
            XCTAssertNil(store.data)
            XCTAssertNil(client.subject)
        }
    }

    func testTokenRefreshPersistsTheMutatedAuthorizationStateBeforeReturning() async throws {
        let driver = FakeAppAuthDriver(state: try makeAuthorizedState())
        let store = AuthorizationStateMemoryStore()
        let client = AppAuthClient(configuration: testConfiguration, store: store, driver: driver)
        try await client.signIn()
        let initialWrites = store.writeCount

        let token = try await client.accessToken(forceRefresh: true)
        XCTAssertEqual(token, "fresh-token")
        XCTAssertEqual(driver.forceRefreshValues, [true])
        XCTAssertEqual(store.writeCount, initialWrites + 1)
        XCTAssertNotNil(store.data)
    }

    func testInvalidRefreshReturnsSessionGateToSignedOut() async throws {
        let driver = FakeAppAuthDriver(state: try makeAuthorizedState())
        let client = AppAuthClient(configuration: testConfiguration, store: AuthorizationStateMemoryStore(), driver: driver)
        let session = SessionStore(authorizationProvider: client)
        await session.signIn()
        XCTAssertEqual(session.state, .signedIn)
        driver.invalidateAuthorizationOnFreshToken = true

        do {
            _ = try await client.accessToken(forceRefresh: true)
            XCTFail("Expected refresh failure")
        } catch {
            XCTAssertEqual(error as? AuthorizationFailure, .unavailable)
        }

        XCTAssertEqual(session.state, .signedOut)
        XCTAssertNil(session.userID)
    }

    func testLogoutClearsLocalAuthorizationEvenWhenProviderLogoutFails() async throws {
        let driver = FakeAppAuthDriver(state: try makeAuthorizedState())
        let store = AuthorizationStateMemoryStore()
        let client = AppAuthClient(configuration: testConfiguration, store: store, driver: driver)
        try await client.signIn()
        driver.endSessionError = FakeAuthorizationError.unavailable

        try await client.signOut()

        XCTAssertTrue(driver.endSessionCalled)
        XCTAssertNil(store.data)
        XCTAssertNil(client.subject)
    }

    private var testConfiguration: AppConfiguration {
        AppConfiguration(
            environment: .test,
            apiBaseURL: URL(string: "https://test.api.drinksaver.kak.im")!,
            issuerURL: URL(string: "https://auth.drinksaver.kak.im/auth/realms/test-drinksaver")!,
            clientID: "drinksaver-ios-test",
            redirectURL: URL(string: "im.kak.drinksaver:/oauth2redirect")!
        )
    }

    private func makeAuthorizedState() throws -> OIDAuthState {
        let issuer = testConfiguration.issuerURL
        let service = OIDServiceConfiguration(
            authorizationEndpoint: issuer.appending(path: "protocol/openid-connect/auth"),
            tokenEndpoint: issuer.appending(path: "protocol/openid-connect/token"),
            issuer: issuer,
            registrationEndpoint: nil,
            endSessionEndpoint: issuer.appending(path: "protocol/openid-connect/logout")
        )
        let request = OIDAuthorizationRequest(
            configuration: service,
            clientId: testConfiguration.clientID,
            clientSecret: nil,
            scopes: ["openid", "profile", "offline_access"],
            redirectURL: testConfiguration.redirectURL,
            responseType: OIDResponseTypeCode,
            additionalParameters: nil
        )
        let idToken = try makeIDToken(subject: "user-123", issuer: issuer.absoluteString)
        let response = OIDAuthorizationResponse(request: request, parameters: [
            "code": "authorization-code" as NSString,
            "access_token": "access-token" as NSString,
            "id_token": idToken as NSString,
            "token_type": "Bearer" as NSString,
            "expires_in": NSNumber(value: 3600),
            "scope": "openid profile offline_access" as NSString
        ])
        return OIDAuthState(authorizationResponse: response)
    }

    private func makeIDToken(subject: String, issuer: String) throws -> String {
        func base64URL(_ data: Data) -> String {
            data.base64EncodedString().replacingOccurrences(of: "+", with: "-")
                .replacingOccurrences(of: "/", with: "_").replacingOccurrences(of: "=", with: "")
        }
        let header = try JSONSerialization.data(withJSONObject: ["alg": "none"])
        let claims = try JSONSerialization.data(withJSONObject: [
            "iss": issuer, "aud": testConfiguration.clientID, "sub": subject,
            "iat": 1_800_000_000, "exp": 1_800_003_600
        ])
        return "\(base64URL(header)).\(base64URL(claims)).signature"
    }
}

@MainActor
private final class FakeAppAuthDriver: AppAuthDriving {
    let state: OIDAuthState?
    var authorizationRequest: OIDAuthorizationRequest?
    var authorizationError: (any Error)?
    var forceRefreshValues: [Bool] = []
    var invalidateAuthorizationOnFreshToken = false
    var endSessionError: (any Error)?
    var endSessionCalled = false

    init(state: OIDAuthState? = nil) { self.state = state }

    func discover(issuer: URL) async throws -> OIDServiceConfiguration {
        OIDServiceConfiguration(
            authorizationEndpoint: issuer.appending(path: "protocol/openid-connect/auth"),
            tokenEndpoint: issuer.appending(path: "protocol/openid-connect/token"),
            issuer: issuer
        )
    }

    func authorize(request: OIDAuthorizationRequest) async throws -> OIDAuthState {
        authorizationRequest = request
        if let authorizationError { throw authorizationError }
        guard let state else { throw AuthorizationFailure.unavailable }
        return state
    }

    func resume(url: URL) -> Bool { true }

    func freshAccessToken(state: OIDAuthState, forceRefresh: Bool) async throws -> String {
        forceRefreshValues.append(forceRefresh)
        if invalidateAuthorizationOnFreshToken {
            state.update(withAuthorizationError: NSError(domain: OIDOAuthAuthorizationErrorDomain, code: 1))
            throw AuthorizationFailure.unavailable
        }
        return "fresh-token"
    }

    func endSession(state: OIDAuthState, redirectURL: URL) async throws {
        endSessionCalled = true
        if let endSessionError { throw endSessionError }
    }
}

private final class AuthorizationStateMemoryStore: AuthorizationDataStoring, @unchecked Sendable {
    private let lock = NSLock()
    private var storedData: Data?
    private var storedWriteCount = 0
    private var storedRequiresSecureCoding = false

    var data: Data? { lock.withLock { storedData } }
    var writeCount: Int { lock.withLock { storedWriteCount } }
    var requiresSecureCoding: Bool { lock.withLock { storedRequiresSecureCoding } }

    init(data: Data? = nil) { storedData = data }
    func read() throws -> Data? { lock.withLock { storedData } }
    func write(_ data: Data) throws {
        lock.withLock {
            storedData = data
            storedWriteCount += 1
            storedRequiresSecureCoding = (try? NSKeyedUnarchiver.unarchivedObject(ofClasses: [
                OIDAuthState.self, OIDAuthorizationRequest.self, OIDAuthorizationResponse.self,
                OIDTokenRequest.self, OIDTokenResponse.self, OIDRegistrationResponse.self,
                OIDServiceConfiguration.self, OIDServiceDiscovery.self, NSError.self,
                NSString.self, NSURL.self, NSDate.self, NSArray.self, NSDictionary.self,
                NSNumber.self, NSSet.self
            ], from: data)) != nil
        }
    }
    func clear() throws { lock.withLock { storedData = nil } }
}

private enum FakeAuthorizationError: Error {
    case unavailable
}
