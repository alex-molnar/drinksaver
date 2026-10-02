import Foundation

@MainActor
protocol AuthorizationProviding: AccessTokenProviding {
    var subject: String? { get }
    func restore() async throws -> Bool
    func signIn() async throws
    func signOut() async throws
    func resume(url: URL) -> Bool
}

enum AuthorizationFailure: Error, Equatable {
    case cancelled
    case unavailable
}
