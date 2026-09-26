import XCTest
@testable import DrinkSaver

@MainActor
final class HistoryStoreTests: XCTestCase {
    func testSevenDayStripIsOldestFirstAndEndsOnCurrentDrinkingDate() {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(secondsFromGMT: 0)!
        XCTAssertEqual(HistoryStore.stripDates(endingAt: "2026-09-25", calendar: calendar), [
            "2026-09-19", "2026-09-20", "2026-09-21", "2026-09-22", "2026-09-23", "2026-09-24", "2026-09-25"
        ])
        XCTAssertTrue(HistoryStore.stripDates(endingAt: "bad-date", calendar: calendar).isEmpty)
        XCTAssertEqual(HistoryDayCount(state: .ready, count: 7).pipCount, 4)
    }

    func testAPIStringsUseGregorianCalendarAndSuppliedTimezone() throws {
        var calendar = Calendar(identifier: .buddhist)
        calendar.timeZone = try XCTUnwrap(TimeZone(identifier: "Europe/Amsterdam"))
        let date = try XCTUnwrap(HistoryStore.parse("2026-09-10", calendar: calendar))

        XCTAssertEqual(HistoryStore.format(date, calendar: calendar), "2026-09-10")
        XCTAssertEqual(Calendar(identifier: .gregorian).component(.weekday, from: date), 5)
    }

    func testLoadStripRefreshesDatesThatWereAlreadyReady() async {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(secondsFromGMT: 0)!
        let clock = HistoryClock(now: calendar.date(from: DateComponents(year: 2026, month: 9, day: 25, hour: 18))!)
        let oldDrink = EditableDrink(id: 42, name: "Old name", alcoholTypeId: 4)
        let newDrink = EditableDrink(id: 42, name: "Updated name", alcoholTypeId: 4)
        let api = HistoryAPI(rows: ["2026-09-24": [oldDrink]])
        let session = SessionStore(authorizationProvider: HistoryAuthorization())
        await session.restore()
        let queue = SaveQueueStore(api: api, sessionStore: session, configuration: nil, clock: clock,
            sleep: { _ in try await Task.sleep(for: .seconds(3600)) }, backgroundWork: { work in await work() })
        let day = CurrentDrinkingDayStore(api: api, queueStore: queue, sessionStore: session, clock: clock, calendar: calendar)
        let history = HistoryStore(api: api, queue: queue, drinkingDay: day, session: session, calendar: calendar)

        await history.select(date: "2026-09-24")
        XCTAssertEqual(history.visibleRows.map(\.drink), [oldDrink])
        await api.setRows([newDrink], for: "2026-09-24")
        await history.loadStrip()

        XCTAssertEqual(history.visibleRows.map(\.drink), [newDrink])
    }

    func testFailedRefreshKeepsCachedRowsReadyAndVisible() async {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(secondsFromGMT: 0)!
        let clock = HistoryClock(now: calendar.date(from: DateComponents(year: 2026, month: 9, day: 25, hour: 18))!)
        let drink = EditableDrink(id: 42, name: "Cached drink", alcoholTypeId: 4)
        let api = HistoryAPI(rows: ["2026-09-24": [drink]])
        let session = SessionStore(authorizationProvider: HistoryAuthorization())
        await session.restore()
        let queue = SaveQueueStore(api: api, sessionStore: session, configuration: nil, clock: clock,
            sleep: { _ in try await Task.sleep(for: .seconds(3600)) }, backgroundWork: { work in await work() })
        let day = CurrentDrinkingDayStore(api: api, queueStore: queue, sessionStore: session, clock: clock, calendar: calendar)
        let history = HistoryStore(api: api, queue: queue, drinkingDay: day, session: session, calendar: calendar)

        await history.loadStrip()
        await history.select(date: "2026-09-24")
        await api.fail(date: "2026-09-24")
        await history.loadStrip()

        XCTAssertEqual(history.days["2026-09-24"], .ready)
        XCTAssertEqual(history.visibleRows.map(\.drink), [drink])
    }

    func testArbitraryDateDeleteRetainsExitThenUndoRestoresCachedRow() async {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(secondsFromGMT: 0)!
        let clock = HistoryClock(now: calendar.date(from: DateComponents(year: 2026, month: 9, day: 25, hour: 18))!)
        let drink = EditableDrink(id: 42, name: "Pale Ale", alcoholTypeId: 4)
        let api = HistoryAPI(rows: ["2026-09-24": [drink]])
        let session = SessionStore(authorizationProvider: HistoryAuthorization())
        await session.restore()
        let queue = SaveQueueStore(api: api, sessionStore: session, configuration: nil, clock: clock,
            sleep: { _ in try await Task.sleep(for: .seconds(3600)) }, backgroundWork: { work in await work() })
        let day = CurrentDrinkingDayStore(api: api, queueStore: queue, sessionStore: session, clock: clock, calendar: calendar)
        let history = HistoryStore(api: api, queue: queue, drinkingDay: day, session: session, calendar: calendar)

        await history.select(date: "2026-09-24")
        XCTAssertEqual(history.visibleRows.map { $0.drink }, [drink])
        history.toggleSelection(id: drink.id)
        XCTAssertEqual(history.selectedIDs, [drink.id])
        history.crossOff()
        XCTAssertEqual(history.visibleRows.first?.exitingToken, 1)
        try? await Task.sleep(for: .milliseconds(400))
        XCTAssertTrue(history.visibleRows.isEmpty)

        queue.undoCurrent()
        history.queueDidChange()
        XCTAssertEqual(history.visibleRows.map { $0.drink }, [drink])
        XCTAssertTrue(history.selectedIDs.isEmpty)
    }

    func testReduceMotionCrossOffRemovesImmediatelyAndUndoRestoresRow() async {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(secondsFromGMT: 0)!
        let clock = HistoryClock(now: calendar.date(from: DateComponents(year: 2026, month: 9, day: 25, hour: 18))!)
        let drink = EditableDrink(id: 42, name: "Pale Ale", alcoholTypeId: 4)
        let api = HistoryAPI(rows: ["2026-09-24": [drink]])
        let session = SessionStore(authorizationProvider: HistoryAuthorization())
        await session.restore()
        let queue = SaveQueueStore(api: api, sessionStore: session, configuration: nil, clock: clock,
            sleep: { _ in try await Task.sleep(for: .seconds(3600)) }, backgroundWork: { work in await work() })
        let day = CurrentDrinkingDayStore(api: api, queueStore: queue, sessionStore: session, clock: clock, calendar: calendar)
        let history = HistoryStore(api: api, queue: queue, drinkingDay: day, session: session, calendar: calendar)

        await history.select(date: "2026-09-24")
        history.crossOff(ids: [drink.id], reduceMotion: true)

        XCTAssertTrue(history.visibleRows.isEmpty)
        XCTAssertEqual(history.dayCount("2026-09-24").count, 0)
        queue.undoCurrent()
        history.queueDidChange()
        XCTAssertEqual(history.visibleRows.map(\.drink), [drink])
    }
}

private struct HistoryClock: Clock { let now: Date }

@MainActor
private final class HistoryAuthorization: AuthorizationProviding {
    var subject: String? = "history-user"
    func restore() async throws -> Bool { true }
    func signIn() async throws {}
    func signOut() async throws { subject = nil }
    func resume(url: URL) -> Bool { false }
    func accessToken(forceRefresh: Bool) async throws -> String { "history-test-token" }
}

private actor HistoryAPI: DrinkSaverAPI {
    private var rowsByDate: [String: [EditableDrink]]
    private var failingDates = Set<String>()
    init(rows: [String: [EditableDrink]]) { rowsByDate = rows }
    func drinks(date: String) async throws -> [EditableDrink] {
        guard !failingDates.contains(date) else { throw APIError.transport }
        return rowsByDate[date] ?? []
    }
    func setRows(_ rows: [EditableDrink], for date: String) { rowsByDate[date] = rows }
    func fail(date: String) { failingDates.insert(date) }
    func deleteDrinks(ids: [Int]) async throws -> Int { ids.count }
    func saveDrink(_ request: DrinkSaveRequest) async throws -> [SavedDrink] { [] }
    func recommendations() async throws -> [Recommendation] { [] }
    func palettes() async throws -> [Palette] { [] }
    func glassware() async throws -> [Glassware] { [] }
}

private extension DrinkSaverAPI {
    func editRecommendations(_ edits: [RecommendationEdit]) async throws -> [Recommendation] { [] }
    func deleteRecommendation(id: Int) async throws {}
    func alcoholTypes() async throws -> [AlcoholType] { [] }
    func createAlcoholType(_ entry: NewAlcoholEntry) async throws -> AlcoholType { throw APIError.decoding }
    func volumes(alcoholTypeID: Int) async throws -> [AlcoholVolume] { [] }
    func createVolume(alcoholTypeID: Int, entry: NewVolumeEntry) async throws -> AlcoholVolume { throw APIError.decoding }
    func subtypes(alcoholTypeID: Int) async throws -> [AlcoholSubtype] { [] }
    func createSubtype(alcoholTypeID: Int, entry: NewAlcoholSubtype) async throws -> AlcoholSubtype { throw APIError.decoding }
    func consumptionTypes(amount: Int) async throws -> [ConsumptionType] { [] }
    func brands() async throws -> [Brand] { [] }
    func createBrand(_ entry: NewBeerBrand) async throws -> Brand { throw APIError.decoding }
    func flavours(brandID: Int) async throws -> [BeerFlavour] { [] }
    func createFlavour(brandID: Int, entry: NewBeerFlavour) async throws -> BeerFlavour { throw APIError.decoding }
}
