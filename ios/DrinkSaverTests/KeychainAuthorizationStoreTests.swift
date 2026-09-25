import Foundation
import Security
import XCTest
@testable import DrinkSaver

final class KeychainAuthorizationStoreTests: XCTestCase {
    func testMissingReadReturnsNil() throws {
        let backend = InMemoryAuthorizationDataStore()
        let store = makeStore(backend: backend)

        XCTAssertNil(try store.read())
        XCTAssertEqual(backend.readQuery?[kSecClass as String] as? String, kSecClassGenericPassword as String)
        XCTAssertEqual(backend.readQuery?[kSecAttrService as String] as? String, "im.kak.drinksaver.auth")
        XCTAssertEqual(backend.readQuery?[kSecAttrAccount as String] as? String, "oid-auth-state")
        XCTAssertEqual(backend.readQuery?[kSecAttrAccessible as String] as? String, kSecAttrAccessibleWhenUnlockedThisDeviceOnly as String)
        XCTAssertEqual(backend.readQuery?[kSecMatchLimit as String] as? String, kSecMatchLimitOne as String)
        XCTAssertEqual(backend.readQuery?[kSecReturnData as String] as? Bool, true)
        XCTAssertNil(backend.readQuery?[kSecAttrSynchronizable as String])
    }

    func testWriteAndReadPreserveBytes() throws {
        let backend = InMemoryAuthorizationDataStore()
        let store = makeStore(backend: backend)
        let state = Data([0, 1, 2, 127, 255])

        try store.write(state)

        XCTAssertEqual(try store.read(), state)
        XCTAssertEqual(backend.addCount, 1)
        XCTAssertEqual(backend.updateCount, 1)
        XCTAssertEqual(backend.addAttributes?[kSecClass as String] as? String, kSecClassGenericPassword as String)
        XCTAssertEqual(backend.addAttributes?[kSecAttrService as String] as? String, "im.kak.drinksaver.auth")
        XCTAssertEqual(backend.addAttributes?[kSecAttrAccount as String] as? String, "oid-auth-state")
        XCTAssertEqual(backend.addAttributes?[kSecAttrAccessible as String] as? String, kSecAttrAccessibleWhenUnlockedThisDeviceOnly as String)
        XCTAssertEqual(backend.addAttributes?[kSecValueData as String] as? Data, state)
        XCTAssertNil(backend.addAttributes?[kSecAttrSynchronizable as String])
    }

    func testSecondWriteReplacesExistingItem() throws {
        let backend = InMemoryAuthorizationDataStore()
        let store = makeStore(backend: backend)

        try store.write(Data("old state".utf8))
        try store.write(Data("new state".utf8))

        XCTAssertEqual(try store.read(), Data("new state".utf8))
        XCTAssertEqual(backend.addCount, 1)
        XCTAssertEqual(backend.updateCount, 2)
        XCTAssertEqual(backend.updateQuery?[kSecClass as String] as? String, kSecClassGenericPassword as String)
        XCTAssertEqual(backend.updateQuery?[kSecAttrService as String] as? String, "im.kak.drinksaver.auth")
        XCTAssertEqual(backend.updateQuery?[kSecAttrAccount as String] as? String, "oid-auth-state")
        XCTAssertEqual(backend.updateQuery?[kSecAttrAccessible as String] as? String, kSecAttrAccessibleWhenUnlockedThisDeviceOnly as String)
        XCTAssertEqual(backend.updateAttributes?[kSecValueData as String] as? Data, Data("new state".utf8))
        XCTAssertNil(backend.updateQuery?[kSecAttrSynchronizable as String])
        XCTAssertNil(backend.updateAttributes?[kSecAttrSynchronizable as String])
    }

    func testClearIsIdempotent() throws {
        let backend = InMemoryAuthorizationDataStore()
        let store = makeStore(backend: backend)
        try store.write(Data("state".utf8))

        try store.clear()
        try store.clear()

        XCTAssertNil(try store.read())
        XCTAssertEqual(backend.clearCount, 2)
        XCTAssertEqual(backend.clearQuery?[kSecAttrAccessible as String] as? String, kSecAttrAccessibleWhenUnlockedThisDeviceOnly as String)
        XCTAssertNil(backend.clearQuery?[kSecAttrSynchronizable as String])
    }

    func testUnexpectedOSStatusIsTypedAndDoesNotExposeStateBytes() {
        let backend = InMemoryAuthorizationDataStore()
        backend.failNextOperation(with: .status(-50))
        let store = makeStore(backend: backend)
        let secret = Data("serialized-secret-state".utf8)

        XCTAssertThrowsError(try store.write(secret)) { error in
            XCTAssertEqual(error as? KeychainAuthorizationStoreError, .status(-50))
            XCTAssertFalse(String(describing: error).contains("serialized-secret-state"))
        }
    }

    func testSecurityKeychainPersistsReplacesAndClearsState() throws {
        let store = KeychainAuthorizationStore(
            service: "im.kak.drinksaver.auth.tests.\(UUID().uuidString)",
            account: "oid-auth-state"
        )
        defer { try? store.clear() }

        XCTAssertNil(try store.read())
        try store.write(Data("first".utf8))
        try store.write(Data("second".utf8))
        XCTAssertEqual(try store.read(), Data("second".utf8))
        try store.clear()
        try store.clear()
        XCTAssertNil(try store.read())
    }

    private func makeStore(backend: InMemoryAuthorizationDataStore) -> KeychainAuthorizationStore {
        KeychainAuthorizationStore(backend: backend)
    }
}
