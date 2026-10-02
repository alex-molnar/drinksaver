import Foundation
import Security

protocol AuthorizationDataStoring: Sendable {
    func read() throws -> Data?
    func write(_ data: Data) throws
    func clear() throws
}

protocol KeychainBackend: Sendable {
    func read(query: [String: Any]) throws -> Data?
    func add(attributes: [String: Any]) throws
    func update(query: [String: Any], attributes: [String: Any]) throws -> Bool
    func clear(query: [String: Any]) throws
}

enum KeychainAuthorizationStoreError: Error, Equatable, Sendable {
    case status(OSStatus)
    case unexpectedResult
}

struct KeychainAuthorizationStore: AuthorizationDataStoring {
    private let service: String
    private let account: String
    private let backend: any KeychainBackend

    init(
        service: String = "im.kak.drinksaver.auth",
        account: String = "oid-auth-state",
        backend: any KeychainBackend = SecurityKeychainBackend()
    ) {
        self.service = service
        self.account = account
        self.backend = backend
    }

    func read() throws -> Data? {
        var query = itemQuery
        query[kSecReturnData as String] = true
        query[kSecMatchLimit as String] = kSecMatchLimitOne
        return try backend.read(query: query)
    }

    func write(_ data: Data) throws {
        let query = itemQuery
        let value = [kSecValueData as String: data]
        if try backend.update(query: query, attributes: value) { return }

        var attributes = query
        attributes[kSecValueData as String] = data
        try backend.add(attributes: attributes)
    }

    func clear() throws {
        try backend.clear(query: itemQuery)
    }

    private var itemQuery: [String: Any] {
        [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
            kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlockedThisDeviceOnly
        ]
    }
}

private struct SecurityKeychainBackend: KeychainBackend {
    func read(query: [String: Any]) throws -> Data? {
        var result: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        if status == errSecItemNotFound { return nil }
        guard status == errSecSuccess else { throw KeychainAuthorizationStoreError.status(status) }
        guard let data = result as? Data else { throw KeychainAuthorizationStoreError.unexpectedResult }
        return data
    }

    func add(attributes: [String: Any]) throws {
        let status = SecItemAdd(attributes as CFDictionary, nil)
        guard status == errSecSuccess else { throw KeychainAuthorizationStoreError.status(status) }
    }

    func update(query: [String: Any], attributes: [String: Any]) throws -> Bool {
        let status = SecItemUpdate(query as CFDictionary, attributes as CFDictionary)
        if status == errSecSuccess { return true }
        if status == errSecItemNotFound { return false }
        throw KeychainAuthorizationStoreError.status(status)
    }

    func clear(query: [String: Any]) throws {
        let status = SecItemDelete(query as CFDictionary)
        guard status == errSecSuccess || status == errSecItemNotFound else {
            throw KeychainAuthorizationStoreError.status(status)
        }
    }
}
