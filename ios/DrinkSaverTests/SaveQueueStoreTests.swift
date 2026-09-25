import XCTest
@testable import DrinkSaver

@MainActor
final class SaveQueueStoreTests: XCTestCase {
    func testSaveRunsImmediatelyRetainsAllIDsAndUndoDeletesThem() async {
        let api = QueueTestAPI(savedIDs: [11, 12])
        let (store, session, _) = await makeStore(api: api)
        let id = store.save(saveOperation())
        await waitUntil { store.state.entries.first?.id == id && store.state.entries.first?.status != .saving }

        XCTAssertEqual(store.state.entries.first?.drinkIDs, [11, 12])
        XCTAssertNotNil(store.currentFeedback)
        store.undoCurrent()
        await waitUntil { store.state.entries.isEmpty }
        let deletedIDs = await api.deletedIDs()
        XCTAssertEqual(deletedIDs, [[11, 12]])
        store.sessionDidSignOut()
        _ = session
    }

    func testDeleteIsHiddenUntilExpiryAndUndoMakesNoRequest() async {
        let api = QueueTestAPI()
        let clock = AdjustableQueueClock(Date(timeIntervalSince1970: 100))
        let (store, _, _) = await makeStore(api: api, clock: clock)
        _ = store.delete(deleteOperation([5]))!
        XCTAssertEqual(store.state.entries.first?.status, .undoable(until: Date(timeIntervalSince1970: 106.5)))
        store.undoCurrent()
        XCTAssertTrue(store.state.entries.isEmpty)
        let deletedIDs = await api.deletedIDs()
        XCTAssertEqual(deletedIDs, [])

        let second = store.delete(deleteOperation([6]))!
        clock.now = Date(timeIntervalSince1970: 106.5)
        store.expireDueEntries()
        await waitUntil { store.state.entries.first(where: { $0.id == second })?.status == .committed }
        let allDeleted = await api.deletedIDs()
        XCTAssertEqual(allDeleted, [[6]])
        store.sessionDidSignOut()
    }

    func testTimedOutSaveRetrySkipsPostWhenServerRowCountIncreased() async {
        let api = QueueTestAPI(savedIDs: [], saveErrors: [.timeout], drinkRows: [drink(1), drink(2), drink(3)])
        let (store, _, _) = await makeStore(api: api)
        _ = store.save(saveOperation(baseline: 2))
        await waitUntil { if case .failed = store.currentFeedback?.status { true } else { false } }
        store.retryCurrent()
        await waitUntil { store.state.entries.first?.status == .committed }
        let saveCount = await api.saveCount()
        XCTAssertEqual(saveCount, 1)
        store.sessionDidSignOut()
    }

    func testTimedOutSaveRetryPostsOnlyWhenCountIsUnchangedOrVerificationFails() async {
        let api = QueueTestAPI(savedIDs: [21], saveErrors: [.timeout], drinkRows: [drink(1), drink(2)])
        let (store, _, _) = await makeStore(api: api)
        _ = store.save(saveOperation(baseline: 2))
        await waitUntil { if case .failed = store.currentFeedback?.status { true } else { false } }
        store.retryCurrent()
        await waitUntil { store.state.entries.first?.drinkIDs == [21] }
        let saveCount = await api.saveCount()
        XCTAssertEqual(saveCount, 2)
        store.sessionDidSignOut()
    }

    func testTimedOutSaveRetryFallsBackToOnePostWhenVerificationFails() async {
        let api = QueueTestAPI(savedIDs: [22], saveErrors: [.timeout], drinkError: .connection)
        let (store, _, _) = await makeStore(api: api)
        _ = store.save(saveOperation(baseline: 2))
        await waitUntil { if case .failed = store.currentFeedback?.status { true } else { false } }

        store.retryCurrent()
        await waitUntil { store.state.entries.first?.drinkIDs == [22] }

        let saveCount = await api.saveCount()
        XCTAssertEqual(saveCount, 2)
        store.sessionDidSignOut()
    }

    func testBackgroundPersistsScopedDeleteBeforeNetworkAndReconcileKeepsOtherScopes() async throws {
        let directory = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString, isDirectory: true)
        defer { try? FileManager.default.removeItem(at: directory) }
        let pending = PendingDeleteStore(fileURL: directory.appendingPathComponent("pending.json"))
        let observed = LockingFlag()
        let api = QueueTestAPI(deleteObserver: { ids in
            observed.value = (try? pending.records().contains(where: { $0.drinkIDs == ids && $0.subject == "account-a" })) ?? false
        })
        let (store, _, configuration) = await makeStore(api: api, pending: pending)
        _ = store.delete(deleteOperation([31, 32]))
        await store.applicationDidEnterBackground()
        XCTAssertTrue(observed.value)

        let matching = PendingDeleteRecord(operationID: UUID(), drinkIDs: [40], environment: .test, issuer: configuration.issuerURL, subject: "account-a")
        let wrongSubject = PendingDeleteRecord(operationID: UUID(), drinkIDs: [41], environment: .test, issuer: configuration.issuerURL, subject: "account-b")
        let wrongEnvironment = PendingDeleteRecord(operationID: UUID(), drinkIDs: [42], environment: .production, issuer: configuration.issuerURL, subject: "account-a")
        try pending.insert(matching)
        try pending.insert(wrongSubject)
        try pending.insert(wrongEnvironment)
        await store.reconcilePersistedDeletes()

        let requests = await api.deletedIDs()
        XCTAssertTrue(requests.contains([40]))
        XCTAssertFalse(requests.contains([41]))
        XCTAssertFalse(requests.contains([42]))
        XCTAssertEqual(try pending.records(), [wrongSubject, wrongEnvironment])
        store.sessionDidSignOut()
    }

    private func makeStore(
        api: QueueTestAPI,
        clock: AdjustableQueueClock = AdjustableQueueClock(Date(timeIntervalSince1970: 100)),
        pending: PendingDeleteStore = PendingDeleteStore(fileURL: FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString).appendingPathComponent("pending.json"))
    ) async -> (SaveQueueStore, SessionStore, AppConfiguration) {
        let provider = QueueTestAuthorizationProvider(subject: "account-a")
        let session = SessionStore(authorizationProvider: provider)
        await session.restore()
        let configuration = AppConfiguration(environment: .test, apiBaseURL: URL(string: "https://api.example.test")!, issuerURL: URL(string: "https://auth.example.test/realm")!, clientID: "test", redirectURL: URL(string: "test:/callback")!)
        let store = SaveQueueStore(api: api, sessionStore: session, configuration: configuration, pendingDeletes: pending, clock: clock, sleep: { _ in try await Task.sleep(for: .seconds(3600)) }, backgroundWork: { work in await work() })
        return (store, session, configuration)
    }

    private func saveOperation(baseline: Int? = nil) -> SaveOperation {
        SaveOperation(label: "Pint", date: "2026-01-02", alcoholTypeID: 3, payload: DrinkSaveRequest(alcoholTypeId: 3, alcoholVolumeId: 4), rowCountBaseline: baseline)
    }

    private func deleteOperation(_ ids: [Int]) -> DeleteOperation {
        DeleteOperation(label: "Pint", date: "2026-01-02", drinkIDs: ids)
    }

    private func drink(_ id: Int) -> EditableDrink { EditableDrink(id: id, name: "Pint", alcoholTypeId: 3) }

    private func waitUntil(_ condition: @MainActor () -> Bool) async {
        for _ in 0..<500 where !condition() { await Task.yield() }
        XCTAssertTrue(condition())
    }
}

@MainActor
private final class QueueTestAuthorizationProvider: AuthorizationProviding {
    var subject: String?
    init(subject: String) { self.subject = subject }
    func restore() async throws -> Bool { true }
    func signIn() async throws {}
    func signOut() async throws { subject = nil }
    func resume(url: URL) -> Bool { false }
    func accessToken(forceRefresh: Bool) async throws -> String { "queue-test-token" }
}

private final class AdjustableQueueClock: Clock, @unchecked Sendable {
    var now: Date
    init(_ now: Date) { self.now = now }
}

private final class LockingFlag: @unchecked Sendable {
    private let lock = NSLock()
    private var stored = false
    var value: Bool {
        get { lock.lock(); defer { lock.unlock() }; return stored }
        set { lock.lock(); defer { lock.unlock() }; stored = newValue }
    }
}

private actor QueueTestAPI: DrinkQueueAPI {
    private var savedIDs: [Int]
    private var saveErrors: [APIError]
    private var drinkRows: [EditableDrink]
    private var drinkError: APIError?
    private var deleted: [[Int]] = []
    private var saves = 0
    private let deleteObserver: (@Sendable ([Int]) -> Void)?

    init(savedIDs: [Int] = [], saveErrors: [APIError] = [], drinkRows: [EditableDrink] = [], drinkError: APIError? = nil, deleteObserver: (@Sendable ([Int]) -> Void)? = nil) {
        self.savedIDs = savedIDs
        self.saveErrors = saveErrors
        self.drinkRows = drinkRows
        self.drinkError = drinkError
        self.deleteObserver = deleteObserver
    }

    func saveDrink(_ request: DrinkSaveRequest) async throws -> [SavedDrink] {
        saves += 1
        if !saveErrors.isEmpty { throw saveErrors.removeFirst() }
        return savedIDs.map { SavedDrink(id: $0, userId: "account-a", date: request.date ?? "2026-01-02", alcoholTypeId: 3, alcoholSubtypeId: nil, alcoholVolumeId: 4, brandId: nil, beerFlavourId: nil, consumptionTypeId: nil, colorPaletteId: nil, glasswareId: nil, comments: nil) }
    }

    func drinks(date: String) async throws -> [EditableDrink] {
        if let drinkError { throw drinkError }
        return drinkRows
    }

    func deleteDrinks(ids: [Int]) async throws -> Int {
        deleteObserver?(ids)
        deleted.append(ids)
        return ids.count
    }

    func deletedIDs() -> [[Int]] { deleted }
    func saveCount() -> Int { saves }
}
