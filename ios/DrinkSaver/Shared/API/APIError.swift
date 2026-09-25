import Foundation

enum APIError: Error, Equatable, Sendable {
    case client(Int)
    case server(Int)
    case unexpectedStatus(Int)
    case timeout
    case connection
    case authentication
    case invalidURL
    case invalidResponse
    case encoding
    case decoding
    case transport

    static func transport(_ error: Error) -> APIError {
        switch RetryPolicy.classify(error) {
        case .timeout:
            .timeout
        case .connection:
            .connection
        case .client(let status):
            .client(status)
        case .server(let status):
            .server(status)
        case .unknown:
            .transport
        }
    }

    static func status(_ code: Int) -> APIError {
        switch code {
        case 400..<500: .client(code)
        case 500..<600: .server(code)
        default: .unexpectedStatus(code)
        }
    }
}
