import Foundation
import Security
@testable import DrinkSaver

final class InMemoryAuthorizationDataStore: KeychainBackend, @unchecked Sendable {
    private let lock = NSLock()
    private var state: Data?
    private var pendingError: KeychainAuthorizationStoreError?
    private var storedReadQuery: [String: Any]?
    private var storedUpdateQuery: [String: Any]?
    private var storedUpdateAttributes: [String: Any]?
    private var storedAddAttributes: [String: Any]?
    private var storedClearQuery: [String: Any]?
    private var storedUpdateCount = 0
    private var storedAddCount = 0
    private var storedClearCount = 0

    var readQuery: [String: Any]? { lock.withLock { storedReadQuery } }
    var updateQuery: [String: Any]? { lock.withLock { storedUpdateQuery } }
    var updateAttributes: [String: Any]? { lock.withLock { storedUpdateAttributes } }
    var addAttributes: [String: Any]? { lock.withLock { storedAddAttributes } }
    var clearQuery: [String: Any]? { lock.withLock { storedClearQuery } }
    var updateCount: Int { lock.withLock { storedUpdateCount } }
    var addCount: Int { lock.withLock { storedAddCount } }
    var clearCount: Int { lock.withLock { storedClearCount } }

    func read(query: [String: Any]) throws -> Data? {
        try lock.withLock {
            try consumePendingError()
            storedReadQuery = query
            return state
        }
    }

    func update(query: [String: Any], attributes: [String: Any]) throws -> Bool {
        try lock.withLock {
            try consumePendingError()
            storedUpdateCount += 1
            storedUpdateQuery = query
            storedUpdateAttributes = attributes
            guard state != nil else { return false }
            state = attributes[kSecValueData as String] as? Data
            return true
        }
    }

    func add(attributes: [String: Any]) throws {
        try lock.withLock {
            try consumePendingError()
            storedAddCount += 1
            storedAddAttributes = attributes
            state = attributes[kSecValueData as String] as? Data
        }
    }

    func clear(query: [String: Any]) throws {
        try lock.withLock {
            try consumePendingError()
            storedClearCount += 1
            storedClearQuery = query
            state = nil
        }
    }

    func failNextOperation(with error: KeychainAuthorizationStoreError) {
        lock.withLock { pendingError = error }
    }

    private func consumePendingError() throws {
        if let pendingError {
            self.pendingError = nil
            throw pendingError
        }
    }
}
