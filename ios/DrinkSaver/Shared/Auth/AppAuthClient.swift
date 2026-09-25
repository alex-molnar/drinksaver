@preconcurrency import AppAuth
import Foundation
import UIKit

@MainActor
protocol AppAuthDriving {
    func discover(issuer: URL) async throws -> OIDServiceConfiguration
    func authorize(request: OIDAuthorizationRequest) async throws -> OIDAuthState
    func resume(url: URL) -> Bool
    func freshAccessToken(state: OIDAuthState, forceRefresh: Bool) async throws -> String
    func endSession(state: OIDAuthState, redirectURL: URL) async throws
}

@MainActor
final class AppAuthClient: AuthorizationProviding {
    private let configuration: AppConfiguration
    private let store: any AuthorizationDataStoring
    private let driver: any AppAuthDriving
    private var authorizationState: OIDAuthState?
    private var authorizationSubject: String?
    private var stateGeneration = 0
    var onAuthorizationInvalidated: (@MainActor () -> Void)?

    var subject: String? { authorizationSubject }

    init(
        configuration: AppConfiguration,
        store: any AuthorizationDataStoring = KeychainAuthorizationStore(),
        driver: any AppAuthDriving = SystemAppAuthDriver()
    ) {
        self.configuration = configuration
        self.store = store
        self.driver = driver
    }

    func restore() async throws -> Bool {
        guard let data = try store.read() else { return false }
        guard let state = Self.unarchive(data), state.isAuthorized,
              let subject = Self.subject(in: state) else {
            try store.clear()
            return false
        }
        authorizationState = state
        authorizationSubject = subject
        return true
    }

    func signIn() async throws {
        let service = try await driver.discover(issuer: configuration.issuerURL)
        let request = OIDAuthorizationRequest(
            configuration: service,
            clientId: configuration.clientID,
            clientSecret: nil,
            scopes: ["openid", "profile", "offline_access"],
            redirectURL: configuration.redirectURL,
            responseType: OIDResponseTypeCode,
            additionalParameters: nil
        )

        do {
            let state = try await driver.authorize(request: request)
            guard state.isAuthorized, let subject = Self.subject(in: state) else {
                throw AuthorizationFailure.unavailable
            }
            try store.write(try Self.archive(state))
            authorizationState = state
            authorizationSubject = subject
            stateGeneration += 1
        } catch {
            if Self.isCancellation(error) { throw AuthorizationFailure.cancelled }
            throw error
        }
    }

    func signOut() async throws {
        let state = authorizationState
        authorizationState = nil
        authorizationSubject = nil
        stateGeneration += 1

        try store.clear()
        if let state { try? await driver.endSession(state: state, redirectURL: configuration.redirectURL) }
    }

    func resume(url: URL) -> Bool {
        driver.resume(url: url)
    }

    func accessToken(forceRefresh: Bool) async throws -> String {
        guard let state = authorizationState else { throw AuthorizationFailure.unavailable }
        let generation = stateGeneration
        do {
            let token = try await driver.freshAccessToken(state: state, forceRefresh: forceRefresh)
            guard generation == stateGeneration, authorizationState === state else {
                throw AuthorizationFailure.unavailable
            }
            try store.write(try Self.archive(state))
            return token
        } catch {
            if !state.isAuthorized, generation == stateGeneration {
                authorizationState = nil
                authorizationSubject = nil
                stateGeneration += 1
                try? store.clear()
                onAuthorizationInvalidated?()
            }
            throw error
        }
    }

    private static func subject(in state: OIDAuthState) -> String? {
        let idToken = state.lastTokenResponse?.idToken ?? state.lastAuthorizationResponse.idToken
        return idToken.flatMap(OIDIDToken.init(idTokenString:))?.subject
    }

    private static func archive(_ state: OIDAuthState) throws -> Data {
        try NSKeyedArchiver.archivedData(withRootObject: state, requiringSecureCoding: true)
    }

    private static func unarchive(_ data: Data) -> OIDAuthState? {
        let allowedClasses: [AnyClass] = [
            OIDAuthState.self, OIDAuthorizationRequest.self, OIDAuthorizationResponse.self,
            OIDTokenRequest.self, OIDTokenResponse.self, OIDRegistrationResponse.self,
            OIDServiceConfiguration.self, OIDServiceDiscovery.self, NSError.self,
            NSString.self, NSURL.self, NSDate.self, NSArray.self, NSDictionary.self,
            NSNumber.self, NSSet.self
        ]
        return (try? NSKeyedUnarchiver.unarchivedObject(ofClasses: allowedClasses, from: data)) as? OIDAuthState
    }

    private static func isCancellation(_ error: any Error) -> Bool {
        let error = error as NSError
        return error.domain == OIDGeneralErrorDomain &&
            error.code == -3
    }
}

@MainActor
private final class SystemAppAuthDriver: AppAuthDriving {
    private var currentFlow: OIDExternalUserAgentSession?

    func discover(issuer: URL) async throws -> OIDServiceConfiguration {
        let result: AppAuthValue<OIDServiceConfiguration> = try await withCheckedThrowingContinuation { continuation in
            OIDAuthorizationService.discoverConfiguration(forIssuer: issuer) { service, error in
                if let service {
                    continuation.resume(returning: AppAuthValue(service))
                } else {
                    continuation.resume(throwing: error ?? AuthorizationFailure.unavailable)
                }
            }
        }
        return result.value
    }

    func authorize(request: OIDAuthorizationRequest) async throws -> OIDAuthState {
        guard let presenter = Self.presentingViewController() else { throw AuthorizationFailure.unavailable }
        let result: AppAuthValue<OIDAuthState> = try await withCheckedThrowingContinuation { continuation in
            currentFlow = OIDAuthState.authState(
                byPresenting: request,
                presenting: presenter
            ) { state, error in
                self.currentFlow = nil
                if let state {
                    continuation.resume(returning: AppAuthValue(state))
                } else {
                    continuation.resume(throwing: error ?? AuthorizationFailure.unavailable)
                }
            }
        }
        return result.value
    }

    func resume(url: URL) -> Bool {
        guard let currentFlow else { return false }
        let resumed = currentFlow.resumeExternalUserAgentFlow(with: url)
        if resumed {
            self.currentFlow = nil
            return true
        }
        return false
    }

    func freshAccessToken(state: OIDAuthState, forceRefresh: Bool) async throws -> String {
        if forceRefresh { state.setNeedsTokenRefresh() }
        return try await withCheckedThrowingContinuation { continuation in
            state.performAction(freshTokens: { accessToken, _, error in
                if let accessToken {
                    continuation.resume(returning: accessToken)
                } else {
                    continuation.resume(throwing: error ?? AuthorizationFailure.unavailable)
                }
            })
        }
    }

    func endSession(state: OIDAuthState, redirectURL: URL) async throws {
        let service = state.lastAuthorizationResponse.request.configuration
        guard service.endSessionEndpoint != nil,
              let idToken = state.lastTokenResponse?.idToken ?? state.lastAuthorizationResponse.idToken,
              let presenter = Self.presentingViewController(),
              let userAgent = OIDExternalUserAgentIOS(presenting: presenter) else { return }
        let request = OIDEndSessionRequest(
            configuration: service,
            idTokenHint: idToken,
            postLogoutRedirectURL: redirectURL,
            additionalParameters: nil
        )
        try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, any Error>) in
            currentFlow = OIDAuthorizationService.present(
                request,
                externalUserAgent: userAgent
            ) { _, error in
                self.currentFlow = nil
                if let error { continuation.resume(throwing: error) }
                else { continuation.resume(returning: ()) }
            }
        }
    }

    private static func presentingViewController() -> UIViewController? {
        let scenes = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
        var controller = scenes.lazy.flatMap(\.windows).first(where: \.isKeyWindow)?.rootViewController
        while let presented = controller?.presentedViewController { controller = presented }
        return controller
    }
}

// AppAuth hands off these Objective-C values at callback completion; the caller resumes on MainActor before using them.
private struct AppAuthValue<Value>: @unchecked Sendable {
    let value: Value

    init(_ value: Value) { self.value = value }
}
