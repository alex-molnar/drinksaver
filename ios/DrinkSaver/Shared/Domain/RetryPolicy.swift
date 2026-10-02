import Foundation

enum RetryKind: Equatable {
    case timeout
    case connection
    case client(Int)
    case server(Int)
    case unknown
}

enum RetryPolicy {
    static func classify(_ error: Error) -> RetryKind {
        if let urlError = error as? URLError {
            switch urlError.code {
            case .timedOut:
                return .timeout
            case .cannotFindHost, .cannotConnectToHost, .networkConnectionLost, .notConnectedToInternet, .dnsLookupFailed:
                return .connection
            default:
                return .unknown
            }
        }
        if let statusError = error as? HTTPStatusError {
            switch statusError.statusCode {
            case 400..<500: return .client(statusError.statusCode)
            case 500..<600: return .server(statusError.statusCode)
            default: return .unknown
            }
        }
        return .unknown
    }
}
