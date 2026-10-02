import XCTest
@testable import DrinkSaver

@MainActor
final class CurrentDrinkingDayStoreTests: XCTestCase {
    func testLoadsDrinksForCurrentDrinkingDay() async {
        let api = CurrentDayTestAPI(rows: [drink(1), drink(2)])
        let (_, _, store) = await makeStores(api: api, clock: AdjustableCurrentDayClock(date(2026, 9, 25, 5)))

        await store.load()

        XCTAssertEqual(store.date, "2026-09-24")
        let requestedDates = await api.requestedDates()
        XCTAssertEqual(requestedDates, ["2026-09-24"])
        XCTAssertEqual(store.serverDrinks, [drink(1), drink(2)])
        XCTAssertEqual(store.visibleCount, 2)
        XCTAssertEqual(store.state, .ready)
    }

    func testFailureCanBeRetriedAndReplacesRows() async {
        let api = CurrentDayTestAPI(rows: [drink(1)], failure: .timeout)
        let (_, _, store) = await makeStores(api: api)

        await store.load()
        XCTAssertEqual(store.state, .failed)

        await api.setFailure(false)
        await api.setRows([drink(2), drink(3)])
        await store.load()

        XCTAssertEqual(store.state, .ready)
        XCTAssertEqual(store.serverDrinks, [drink(2), drink(3)])
        XCTAssertEqual(store.visibleCount, 2)
    }

    func testQueueSaveInsertionIsIncludedUntilRefetchedFromServer() async {
        let api = CurrentDayTestAPI()
        let (_, queue, store) = await makeStores(api: api)
        await store.load()
        let operation = SaveOperation(
            label: "Pint",
            date: store.date,
            alcoholTypeID: 3,
            payload: DrinkSaveRequest(alcoholTypeId: 3, alcoholVolumeId: 4),
            rowCountBaseline: 0
        )

        _ = queue.save(operation)
        await waitUntil { store.visibleCount == 1 }
        XCTAssertEqual(store.visibleCount, 1)

        await api.setRows([drink(41)])
        await store.load()
        XCTAssertEqual(store.visibleCount, 1)
        XCTAssertEqual(store.serverDrinks, [drink(41)])

        await waitUntil {
            guard let status = queue.currentFeedback?.status else { return false }
            if case .undoable = status { return true }
            return false
        }
        queue.undoCurrent()
        await waitUntil { queue.state.entries.isEmpty }
        XCTAssertEqual(store.visibleCount, 0)
    }

    func testDeleteSuppressionUndoAndCommittedRefetch() async {
        let api = CurrentDayTestAPI(rows: [drink(1), drink(2)])
        let clock = AdjustableCurrentDayClock(date(2026, 9, 25, 20))
        let (_, queue, store) = await makeStores(api: api, clock: clock)
        await store.load()

        _ = queue.delete(DeleteOperation(label: "Pint", date: store.date, drinkIDs: [1]))
        XCTAssertEqual(store.visibleCount, 1)
        queue.undoCurrent()
        XCTAssertEqual(store.visibleCount, 2)

        _ = queue.delete(DeleteOperation(label: "Pint", date: store.date, drinkIDs: [1]))
        clock.now = clock.now.addingTimeInterval(7)
        queue.expireDueEntries()
        await waitUntil { queue.state.entries.first?.status == .committed }
        XCTAssertEqual(store.visibleCount, 1)

        await api.setRows([drink(2)])
        await store.load()
        XCTAssertEqual(store.visibleCount, 1)
        XCTAssertEqual(store.serverDrinks, [drink(2)])
        XCTAssertTrue(queue.state.entries.isEmpty)
    }

    func testClockBoundaryReloadsForNewDayAndTimezone() async {
        let api = CurrentDayTestAPI(rows: [drink(1)])
        let clock = AdjustableCurrentDayClock(date(2026, 9, 25, 5, 59))
        let (_, _, store) = await makeStores(api: api, clock: clock, timeZone: TimeZone(identifier: "Europe/Amsterdam")!)
        await store.load()

        clock.now = date(2026, 9, 25, 6, 0, timeZone: "Europe/Amsterdam")
        await store.refreshClockState()
        XCTAssertEqual(store.date, "2026-09-25")

        var utcCalendar = Calendar(identifier: .gregorian)
        utcCalendar.timeZone = TimeZone(secondsFromGMT: 0)!
        let utcInstant = date(2026, 9, 25, 4, 30, timeZone: "UTC")
        let (_, _, utcStore) = await makeStores(api: api, clock: AdjustableCurrentDayClock(utcInstant), calendar: utcCalendar)
        XCTAssertEqual(utcStore.date, "2026-09-24")
    }

    func testNextClockUpdateDelayUsesCalendarTimezone() async {
        let zone = TimeZone(identifier: "Europe/Amsterdam")!
        let clock = AdjustableCurrentDayClock(date(2026, 9, 25, 5, 59, timeZone: zone.identifier))
        let (_, _, store) = await makeStores(api: CurrentDayTestAPI(), clock: clock, timeZone: zone)

        XCTAssertEqual(store.secondsUntilNextClockUpdate, 60, accuracy: 1)

        clock.now = date(2026, 9, 25, 6, 0, timeZone: zone.identifier)
        await store.refreshClockState()
        XCTAssertEqual(store.secondsUntilNextClockUpdate, 18 * 60 * 60, accuracy: 1)
    }

    func testMidnightRefreshUpdatesTonightWithoutAdvancingDrinkingDay() async {
        let api = CurrentDayTestAPI(rows: [drink(1)])
        let clock = AdjustableCurrentDayClock(date(2026, 9, 25, 23, 59))
        let (_, _, store) = await makeStores(api: api, clock: clock)
        await store.load()

        XCTAssertFalse(store.isTonight)
        clock.now = date(2026, 9, 26, 0, 0)
        XCTAssertFalse(store.isTonight, "The view state stays stable until the scheduled clock update.")

        await store.refreshClockState()

        XCTAssertTrue(store.isTonight)
        XCTAssertEqual(store.date, "2026-09-25")
        XCTAssertEqual(store.secondsUntilNextClockUpdate, 6 * 60 * 60, accuracy: 1)
        let requestedDates = await api.requestedDates()
        XCTAssertEqual(requestedDates, ["2026-09-25"])
    }

    func testSignOutDiscardsLateResponseAndClearsAccountData() async {
        let gate = CurrentDayFetchGate()
        let api = CurrentDayTestAPI(rows: [drink(1)], gate: gate)
        let (session, _, store) = await makeStores(api: api)
        let load = Task { await store.load() }
        await gate.waitUntilRequested()
        XCTAssertEqual(store.state, .loading)

        await session.signOut()
        store.sessionDidSignOut()
        await gate.release()
        await load.value

        XCTAssertEqual(store.state, .idle)
        XCTAssertTrue(store.serverDrinks.isEmpty)
        XCTAssertEqual(store.visibleCount, 0)
    }

    private func makeStores(
        api: CurrentDayTestAPI,
        clock: AdjustableCurrentDayClock? = nil,
        calendar: Calendar? = nil,
        timeZone: TimeZone = TimeZone(secondsFromGMT: 0)!
    ) async -> (SessionStore, SaveQueueStore, CurrentDrinkingDayStore) {
        let session = SessionStore(authorizationProvider: CurrentDayAuthorization(subject: "account-a"))
        await session.restore()
        var resolvedCalendar = calendar ?? Calendar(identifier: .gregorian)
        if calendar == nil { resolvedCalendar.timeZone = timeZone }
        let clock = clock ?? AdjustableCurrentDayClock(Date())
        let queue = SaveQueueStore(
            api: api,
            sessionStore: session,
            configuration: nil,
            clock: clock,
            sleep: { _ in try await Task.sleep(for: .seconds(3600)) },
            backgroundWork: { work in await work() }
        )
        let store = CurrentDrinkingDayStore(api: api, queueStore: queue, sessionStore: session, clock: clock, calendar: resolvedCalendar)
        return (session, queue, store)
    }

    private func waitUntil(_ condition: @MainActor () -> Bool) async {
        for _ in 0..<500 where !condition() { await Task.yield() }
        XCTAssertTrue(condition())
    }

    private func drink(_ id: Int) -> EditableDrink { EditableDrink(id: id, name: "Pint", alcoholTypeId: 3) }

    private func date(_ year: Int, _ month: Int, _ day: Int, _ hour: Int, _ minute: Int = 0, timeZone: String = "UTC") -> Date {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(identifier: timeZone)!
        return calendar.date(from: DateComponents(year: year, month: month, day: day, hour: hour, minute: minute))!
    }
}

@MainActor
private final class CurrentDayAuthorization: AuthorizationProviding {
    var subject: String?
    init(subject: String?) { self.subject = subject }
    func restore() async throws -> Bool { subject != nil }
    func signIn() async throws {}
    func signOut() async throws { subject = nil }
    func resume(url: URL) -> Bool { false }
    func accessToken(forceRefresh: Bool) async throws -> String { "current-day-test-token" }
}

private final class AdjustableCurrentDayClock: Clock, @unchecked Sendable {
    var now: Date
    init(_ now: Date) { self.now = now }
}

private actor CurrentDayTestAPI: DrinkQueueAPI {
    private var rows: [EditableDrink]
    private var failure: APIError?
    private var dates: [String] = []
    private let gate: CurrentDayFetchGate?

    init(rows: [EditableDrink] = [], failure: APIError? = nil, gate: CurrentDayFetchGate? = nil) {
        self.rows = rows
        self.failure = failure
        self.gate = gate
    }

    func saveDrink(_ request: DrinkSaveRequest) async throws -> [SavedDrink] {
        [SavedDrink(id: 41, userId: "account-a", date: request.date ?? "2026-09-25", alcoholTypeId: 3, alcoholSubtypeId: nil, alcoholVolumeId: 4, brandId: nil, beerFlavourId: nil, consumptionTypeId: nil, colorPaletteId: nil, glasswareId: nil, comments: nil)]
    }

    func drinks(date: String) async throws -> [EditableDrink] {
        dates.append(date)
        await gate?.arriveAndWait()
        if let failure { throw failure }
        return rows
    }

    func deleteDrinks(ids: [Int]) async throws -> Int { ids.count }
    func requestedDates() -> [String] { dates }
    func setRows(_ value: [EditableDrink]) { rows = value }
    func setFailure(_ value: Bool) { failure = value ? .timeout : nil }
}

private actor CurrentDayFetchGate {
    private var requested = false
    private var released = false
    private var requestWaiters: [CheckedContinuation<Void, Never>] = []
    private var releaseWaiters: [CheckedContinuation<Void, Never>] = []

    func arriveAndWait() async {
        requested = true
        requestWaiters.forEach { $0.resume() }
        requestWaiters.removeAll()
        guard !released else { return }
        await withCheckedContinuation { releaseWaiters.append($0) }
    }

    func waitUntilRequested() async {
        guard !requested else { return }
        await withCheckedContinuation { requestWaiters.append($0) }
    }

    func release() {
        released = true
        releaseWaiters.forEach { $0.resume() }
        releaseWaiters.removeAll()
    }
}
