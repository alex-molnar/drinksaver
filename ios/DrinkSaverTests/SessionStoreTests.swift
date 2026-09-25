import Foundation
import XCTest
@testable import DrinkSaver

@MainActor
final class SessionStoreTests: XCTestCase {
    func testRestoreSuccessExposesAuthenticatedSubject() async {
        let provider = FakeAuthorizationProvider(restored: true, subject: "user-123")
        let store = SessionStore(authorizationProvider: provider)

        await store.restore()

        XCTAssertEqual(store.state, .signedIn)
        XCTAssertEqual(store.userID, "user-123")
        XCTAssertEqual(provider.restoreCount, 1)
    }

    func testRestoreWithoutSavedAuthorizationSignsOut() async {
        let store = SessionStore(authorizationProvider: FakeAuthorizationProvider())

        await store.restore()

        XCTAssertEqual(store.state, .signedOut)
        XCTAssertNil(store.userID)
    }

    func testRestoreFailureKeepsApplicationUnauthenticated() async {
        let provider = FakeAuthorizationProvider()
        provider.restoreError = FakeAuthorizationError.unavailable
        let store = SessionStore(authorizationProvider: provider)

        await store.restore()

        XCTAssertEqual(store.state, .failed("Unable to restore your session. Please sign in again."))
        XCTAssertNil(store.userID)
    }

    func testSignInSuccessMovesThroughAuthorizingAndSignsIn() async {
        let provider = FakeAuthorizationProvider(subject: "user-456")
        let store = SessionStore(authorizationProvider: provider)
        provider.onSignIn = { XCTAssertEqual(store.state, .authorizing) }

        await store.signIn()

        XCTAssertEqual(store.state, .signedIn)
        XCTAssertEqual(store.userID, "user-456")
    }

    func testSignInCancellationReturnsToSignedOut() async {
        let provider = FakeAuthorizationProvider()
        provider.signInError = AuthorizationFailure.cancelled
        let store = SessionStore(authorizationProvider: provider)

        await store.signIn()

        XCTAssertEqual(store.state, .signedOut)
    }

    func testSignInFailureUsesSafeMessage() async {
        let provider = FakeAuthorizationProvider()
        provider.signInError = FakeAuthorizationError.unavailable
        let store = SessionStore(authorizationProvider: provider)

        await store.signIn()

        XCTAssertEqual(store.state, .failed("Unable to sign in. Please try again."))
    }

    func testSignOutAlwaysClearsSessionState() async {
        let provider = FakeAuthorizationProvider(restored: true, subject: "user-123")
        let store = SessionStore(authorizationProvider: provider)
        await store.restore()

        await store.signOut()

        XCTAssertEqual(store.state, .signedOut)
        XCTAssertNil(store.userID)
        XCTAssertEqual(provider.signOutCount, 1)
    }

    func testOpenURLIsForwardedToAuthorizationProvider() {
        let provider = FakeAuthorizationProvider()
        let store = SessionStore(authorizationProvider: provider)
        let callback = URL(string: "im.kak.drinksaver:/oauth2redirect?state=test")!

        XCTAssertTrue(store.handleOpenURL(callback))
        XCTAssertEqual(provider.resumedURLs, [callback])
    }
}

@MainActor
private final class FakeAuthorizationProvider: AuthorizationProviding {
    var subject: String?
    var restored: Bool
    var restoreError: (any Error)?
    var signInError: (any Error)?
    var onSignIn: (() -> Void)?
    private(set) var restoreCount = 0
    private(set) var signOutCount = 0
    private(set) var resumedURLs: [URL] = []

    init(restored: Bool = false, subject: String? = nil) {
        self.restored = restored
        self.subject = subject
    }

    func restore() async throws -> Bool {
        restoreCount += 1
        if let restoreError { throw restoreError }
        return restored
    }

    func signIn() async throws {
        onSignIn?()
        if let signInError { throw signInError }
    }

    func signOut() async throws { signOutCount += 1; subject = nil }
    func resume(url: URL) -> Bool { resumedURLs.append(url); return true }
    func accessToken(forceRefresh: Bool) async throws -> String { "test-token" }
}

private enum FakeAuthorizationError: Error {
    case unavailable
}
