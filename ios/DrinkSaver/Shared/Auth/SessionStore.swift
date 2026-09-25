import Foundation
import Observation

enum SessionState: Equatable {
    case restoring
    case signedOut
    case authorizing
    case signedIn
    case failed(String)
}

@MainActor
@Observable
final class SessionStore {
    private(set) var state: SessionState = .restoring
    private let authorizationProvider: (any AuthorizationProviding)?

    var userID: String? {
        guard state == .signedIn else { return nil }
        return authorizationProvider?.subject
    }

    init(authorizationProvider: (any AuthorizationProviding)?) {
        self.authorizationProvider = authorizationProvider
        (authorizationProvider as? AppAuthClient)?.onAuthorizationInvalidated = { [weak self] in
            self?.state = .signedOut
        }
    }

    func restore() async {
        state = .restoring
        do {
            guard let authorizationProvider else {
                state = .failed("Authentication configuration is unavailable.")
                return
            }
            state = try await authorizationProvider.restore() ? .signedIn : .signedOut
        } catch {
            state = .failed("Unable to restore your session. Please sign in again.")
        }
    }

    func signIn() async {
        state = .authorizing
        do {
            guard let authorizationProvider else {
                state = .failed("Authentication configuration is unavailable.")
                return
            }
            try await authorizationProvider.signIn()
            state = .signedIn
        } catch AuthorizationFailure.cancelled {
            state = .signedOut
        } catch {
            state = .failed("Unable to sign in. Please try again.")
        }
    }

    func signOut() async {
        do {
            try await authorizationProvider?.signOut()
            state = .signedOut
        } catch {
            state = .failed("Unable to clear your local session securely.")
        }
    }

    func handleOpenURL(_ url: URL) -> Bool {
        authorizationProvider?.resume(url: url) ?? false
    }
}
