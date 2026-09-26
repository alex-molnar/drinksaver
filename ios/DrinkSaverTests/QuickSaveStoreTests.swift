import XCTest
@testable import DrinkSaver

@MainActor
final class QuickSaveStoreTests: XCTestCase {
    func testCompositeKeyDistinguishesRecommendationsWithoutIDs() {
        let first = recommendation(id: nil, type: 1, volume: 2, brand: nil)
        let second = recommendation(id: nil, type: 1, volume: 2, brand: 3)

        XCTAssertEqual(QuickSaveStore.key(for: first), "null-1-2-null")
        XCTAssertEqual(QuickSaveStore.key(for: second), "null-1-2-3")
        XCTAssertEqual(QuickSaveStore.key(for: recommendation(id: 4, type: 1, volume: 2, brand: nil)), "4-1-2-null")
    }

    func testLoadFailureAndRetry() async {
        let api = QuickSaveTestAPI(recommendationFailure: true)
        let graph = await makeGraph(api: api)

        XCTAssertEqual(graph.quick.state, .loading)
        await graph.quick.load()
        XCTAssertEqual(graph.quick.state, .failed)

        await api.setRecommendationFailure(false)
        await graph.quick.load()
        XCTAssertEqual(graph.quick.state, .ready([rec]))
    }

    func testSaveUsesRecommendationFieldsResolvedDesignAndCurrentDrinkingDay() async {
        let api = QuickSaveTestAPI()
        let clock = AdjustableQuickSaveClock(date(2026, 9, 25, 5, 30))
        let graph = await makeGraph(api: api, clock: clock)
        await graph.day.load()
        await graph.quick.load()

        XCTAssertEqual(graph.quick.design(for: rec), ResolvedDrinkDesign(palette: palette, glassware: glass))
        graph.quick.save(rec)
        await waitUntil { await api.savedRequests().count == 1 }

        let requests = await api.savedRequests()
        let request = try? XCTUnwrap(requests.first)
        XCTAssertEqual(request?.date, "2026-09-24")
        XCTAssertEqual(request?.alcoholTypeId, 4)
        XCTAssertEqual(request?.alcoholSubtypeId, 5)
        XCTAssertEqual(request?.alcoholVolumeId, 6)
        XCTAssertEqual(request?.brandId, 7)
        XCTAssertEqual(request?.beerFlavourId, 8)
        XCTAssertEqual(request?.consumptionTypeId, 9)
        XCTAssertEqual(request?.colorPaletteId, 11)
        XCTAssertEqual(request?.glasswareId, 12)
        await waitUntil { graph.quick.currentDayCount == 1 }
        XCTAssertEqual(graph.quick.currentDayCount, 1)
    }

    func testOnlyOneSaveRunsAndPlateStatusComesFromQueue() async {
        let gate = QuickSaveGate()
        let api = QuickSaveTestAPI(saveGate: gate)
        let graph = await makeGraph(api: api)
        await graph.quick.load()
        graph.quick.save(rec)

        await gate.waitForSave()
        XCTAssertEqual(graph.quick.savingRecommendationKey, QuickSaveStore.key(for: rec))
        graph.quick.save(recommendation(id: 3, type: 3, volume: 4, brand: nil))
        XCTAssertEqual(graph.queue.state.entries.count, 1)

        await gate.release()
        await waitUntil { graph.quick.doneRecommendationKey == QuickSaveStore.key(for: self.rec) }
        XCTAssertNil(graph.quick.savingRecommendationKey)
    }

    func testAddDrinkCreateDoesNotAdoptResultAfterParentSelectionChanges() async {
        let gate = AddDrinkCreateGate()
        let api = QuickSaveTestAPI(volumeCreateGate: gate)
        let graph = await makeGraph(api: api)
        let coordinator = AppCoordinator()
        let addStore = AddDrinkStore(api: api, queue: graph.queue, day: graph.day, designs: graph.designs,
                                     session: graph.session, coordinator: coordinator)
        addStore.draft.alcoholType = AlcoholType(id: 4, userId: nil, name: "Beer", volumeIds: [], colorPaletteId: 1, glasswareId: 2)
        coordinator.presentAdd()
        coordinator.push(.option(.volume))
        coordinator.push(.create(.volume))

        let createTask = Task { await addStore.create(.volume, name: "Old size", litres: 0.33) }
        await gate.waitForCreate()
        await addStore.create(.volume, name: "Duplicate size", litres: 0.5)
        addStore.selectAlcoholType(AlcoholType(id: 9, userId: nil, name: "Wine", volumeIds: [], colorPaletteId: 3, glasswareId: 4))
        await gate.releaseCreate()
        await createTask.value

        XCTAssertNil(addStore.draft.volume)
        XCTAssertFalse(addStore.isCreating)
        let createCount = await api.volumeCreateCount()
        XCTAssertEqual(createCount, 1)

        addStore.draft.creationName = "New size"
        addStore.setRecommend(true)
        addStore.draft.recommendationName = "Saved name"
        await addStore.create(.volume, name: addStore.draft.creationName, litres: 0.5)
        XCTAssertEqual(addStore.draft.creationName, "")
        XCTAssertEqual(addStore.draft.recommendationName, "Saved name")
    }

    func testAddDrinkLoadsConsumptionTypesWithFixedPageSize() async {
        let api = QuickSaveTestAPI()
        let graph = await makeGraph(api: api)
        let store = AddDrinkStore(api: api, queue: graph.queue, day: graph.day, designs: graph.designs,
                                  session: graph.session, coordinator: AppCoordinator())
        store.reset()
        XCTAssertEqual(store.draft.date.map(AddDrinkStore.apiDate), graph.day.date)
        store.draft.volume = AlcoholVolume(id: 6, name: "Pint", volume: 0.568)
        await store.loadConsumptionTypes()

        let amount = await api.lastConsumptionTypeAmount()
        XCTAssertEqual(amount, 100)
    }

    func testRecommendationRefreshWaitsForQueueSaveToFinish() async {
        let gate = QuickSaveGate()
        let api = QuickSaveTestAPI(saveGate: gate)
        let clock = AdjustableQuickSaveClock(date(2026, 9, 25, 20))
        let graph = await makeGraph(api: api, clock: clock)
        await graph.quick.load()
        graph.quick.save(rec)

        await gate.waitForSave()
        graph.quick.queueDidChange()
        let initialRequestCount = await api.recommendationRequestCount()
        XCTAssertEqual(initialRequestCount, 1)

        await gate.release()
        await waitUntil { graph.queue.currentFeedback != nil }
        graph.quick.queueDidChange()
        try? await Task.sleep(for: .milliseconds(50))
        let requestCountBeforeUndoExpires = await api.recommendationRequestCount()
        XCTAssertEqual(requestCountBeforeUndoExpires, 1)

        clock.now = clock.now.addingTimeInterval(7)
        graph.queue.expireDueEntries()
        graph.quick.queueDidChange()
        await waitUntil { await api.recommendationRequestCount() == 2 }
        XCTAssertEqual(graph.quick.state, .ready([rec]))
    }

    func testSaveUsesRawServerCountWhenPendingDeleteReducesVisibleCount() async {
        let api = QuickSaveTestAPI(initialDrinks: [EditableDrink(id: 1, name: "One", alcoholTypeId: 4),
                                                   EditableDrink(id: 2, name: "Two", alcoholTypeId: 4),
                                                   EditableDrink(id: 3, name: "Three", alcoholTypeId: 4)])
        let graph = await makeGraph(api: api)
        await graph.day.load()
        await graph.quick.load()
        _ = graph.queue.delete(DeleteOperation(label: "One", date: graph.day.date, drinkIDs: [1]))

        XCTAssertEqual(graph.day.visibleCount, 2)
        XCTAssertEqual(graph.day.serverRowCount, 3)
        graph.quick.save(rec)

        guard case .save(let operation)? = graph.queue.state.entries.last?.kind else {
            return XCTFail("Expected a queued recommendation save")
        }
        XCTAssertEqual(operation.rowCountBaseline, 3)
    }

    func testSuccessfulSavesRefreshServerSnapshotBeforeCommittedEntriesArePruned() async {
        let api = QuickSaveTestAPI()
        let clock = AdjustableQuickSaveClock(date(2026, 9, 25, 20))
        let graph = await makeGraph(api: api, clock: clock)
        await graph.day.load()
        await graph.quick.load()

        graph.quick.save(rec)
        await waitUntil { graph.queue.currentFeedback != nil }
        graph.quick.queueDidChange()
        await waitUntil { graph.day.serverDrinks.contains { $0.id == 45 } }
        XCTAssertEqual(graph.quick.currentDayCount, 1)

        clock.now = clock.now.addingTimeInterval(7)
        graph.queue.expireDueEntries()
        graph.quick.queueDidChange()
        graph.quick.save(rec)
        await waitUntil { graph.queue.state.entries.contains { $0.drinkIDs == [46] } }
        graph.quick.queueDidChange()
        await waitUntil { graph.day.serverDrinks.contains { $0.id == 46 } }

        XCTAssertEqual(graph.quick.currentDayCount, 2)
        XCTAssertTrue(graph.day.serverDrinks.contains { $0.id == 45 })
    }

    func testSharedCountTracksUndoAndDrinkingDayRollover() async {
        let api = QuickSaveTestAPI()
        let clock = AdjustableQuickSaveClock(date(2026, 9, 25, 5, 30))
        let graph = await makeGraph(api: api, clock: clock)
        await graph.day.load()
        await graph.quick.load()
        graph.quick.save(rec)
        await waitUntil { graph.quick.currentDayCount == 1 }

        graph.queue.undoCurrent()
        await waitUntil { graph.quick.currentDayCount == 0 }
        XCTAssertEqual(graph.quick.currentDayCount, graph.day.visibleCount)

        clock.now = date(2026, 9, 25, 6, 0)
        await graph.day.refreshClockState()
        XCTAssertEqual(graph.quick.currentDayCount, graph.day.visibleCount)
        XCTAssertEqual(graph.day.date, "2026-09-25")
    }

    private var rec: Recommendation { quickSaveRecommendation }

    private func recommendation(id: Int?, type: Int, volume: Int, brand: Int?) -> Recommendation {
        Recommendation(id: id, userId: "user", name: "Test drink", alcoholTypeId: type, alcoholSubtypeId: nil,
                       alcoholVolumeId: volume, brandId: brand, beerFlavourId: nil, consumptionTypeId: nil,
                       endDate: nil, colorPaletteId: nil, glasswareId: nil, orderNumber: nil)
    }

    private func makeGraph(api: QuickSaveTestAPI, clock suppliedClock: AdjustableQuickSaveClock? = nil) async -> Graph {
        let clock = suppliedClock ?? AdjustableQuickSaveClock(date(2026, 9, 25, 20))
        let session = SessionStore(authorizationProvider: QuickSaveAuthorization())
        await session.restore()
        let queue = SaveQueueStore(api: api, sessionStore: session, configuration: nil, clock: clock,
                                   sleep: { _ in try await Task.sleep(for: .seconds(3_600)) })
        let day = CurrentDrinkingDayStore(api: api, queueStore: queue, sessionStore: session, clock: clock)
        let designs = DesignCatalogueStore(api: api, sessionStore: session)
        await designs.load()
        let quick = QuickSaveStore(api: api, sessionStore: session, designCatalogueStore: designs,
                                   queueStore: queue, drinkingDayStore: day, coordinator: AppCoordinator())
        return Graph(quick: quick, queue: queue, day: day, clock: clock, session: session, designs: designs)
    }

    private func date(_ year: Int, _ month: Int, _ day: Int, _ hour: Int, _ minute: Int = 0) -> Date {
        var components = DateComponents()
        components.calendar = Calendar(identifier: .gregorian)
        components.timeZone = TimeZone(identifier: "Europe/Amsterdam")
        components.year = year
        components.month = month
        components.day = day
        components.hour = hour
        components.minute = minute
        return components.date!
    }

    private func waitUntil(_ condition: @escaping @MainActor () async -> Bool) async {
        for _ in 0..<200 {
            if await condition() { return }
            try? await Task.sleep(for: .milliseconds(10))
        }
        XCTFail("Condition did not become true before timeout")
    }

    private struct Graph {
        let quick: QuickSaveStore
        let queue: SaveQueueStore
        let day: CurrentDrinkingDayStore
        let clock: AdjustableQuickSaveClock
        let session: SessionStore
        let designs: DesignCatalogueStore
    }
}

private let palette = Palette(id: 11, name: "copper", field: "#B44632", inkLight: nil, inkDark: "#24120F")
private let glass = Glassware(id: 12, name: "tulip", g: "M10 4h14v39H10Z", l: "M11 13h12v29H11Z", f: nil)
private let quickSaveRecommendation = Recommendation(
    id: nil, userId: "user", name: "House pilsner", alcoholTypeId: 4, alcoholSubtypeId: 5,
    alcoholVolumeId: 6, brandId: 7, beerFlavourId: 8, consumptionTypeId: 9,
    endDate: nil, colorPaletteId: 11, glasswareId: 12, orderNumber: 0
)

private final class AdjustableQuickSaveClock: Clock, @unchecked Sendable {
    var now: Date
    init(_ now: Date) { self.now = now }
}

@MainActor
private final class QuickSaveAuthorization: AuthorizationProviding {
    var subject: String? { "user" }
    func restore() async throws -> Bool { true }
    func signIn() async throws {}
    func signOut() async throws {}
    func resume(url: URL) -> Bool { false }
    func accessToken(forceRefresh: Bool) async throws -> String { "token" }
}

private actor QuickSaveTestAPI: DrinkSaverAPI {
    private var recommendations = [quickSaveRecommendation]
    private var recommendationFailure: Bool
    private var requests = 0
    private var saves: [DrinkSaveRequest] = []
    private var drinks: [EditableDrink] = []
    private let saveGate: QuickSaveGate?
    private let volumeCreateGate: AddDrinkCreateGate?
    private var volumeCreates = 0
    private var consumptionTypeAmount: Int?

    init(recommendationFailure: Bool = false, saveGate: QuickSaveGate? = nil, volumeCreateGate: AddDrinkCreateGate? = nil, initialDrinks: [EditableDrink] = []) {
        self.recommendationFailure = recommendationFailure
        self.saveGate = saveGate
        self.volumeCreateGate = volumeCreateGate
        self.drinks = initialDrinks
    }

    func recommendations() async throws -> [Recommendation] {
        requests += 1
        if recommendationFailure { throw QuickSaveAPIError.unavailable }
        return recommendations
    }

    func palettes() async throws -> [Palette] { [palette] }
    func glassware() async throws -> [Glassware] { [glass] }
    func drinks(date: String) async throws -> [EditableDrink] { drinks }

    func saveDrink(_ request: DrinkSaveRequest) async throws -> [SavedDrink] {
        saves.append(request)
        await saveGate?.arriveAndWait()
        let id = 44 + saves.count
        let row = SavedDrink(id: id, userId: "user", date: request.date ?? "", alcoholTypeId: request.alcoholTypeId,
                             alcoholSubtypeId: request.alcoholSubtypeId, alcoholVolumeId: request.alcoholVolumeId,
                             brandId: request.brandId, beerFlavourId: request.beerFlavourId,
                             consumptionTypeId: request.consumptionTypeId, colorPaletteId: request.colorPaletteId,
                             glasswareId: request.glasswareId, comments: nil)
        drinks.append(EditableDrink(id: row.id, name: "House pilsner", alcoholTypeId: row.alcoholTypeId))
        return [row]
    }

    func createVolume(alcoholTypeID: Int, entry: NewVolumeEntry) async throws -> AlcoholVolume {
        volumeCreates += 1
        await volumeCreateGate?.arriveAndWait()
        return AlcoholVolume(id: 55, name: entry.name, volume: entry.volume)
    }
    func consumptionTypes(amount: Int) async throws -> [ConsumptionType] {
        consumptionTypeAmount = amount
        return []
    }

    func deleteDrinks(ids: [Int]) async throws -> Int {
        drinks.removeAll { ids.contains($0.id) }
        return ids.count
    }

    func setRecommendationFailure(_ fails: Bool) { recommendationFailure = fails }
    func savedRequests() -> [DrinkSaveRequest] { saves }
    func recommendationRequestCount() -> Int { requests }
    func volumeCreateCount() -> Int { volumeCreates }
    func lastConsumptionTypeAmount() -> Int? { consumptionTypeAmount }
}

private actor AddDrinkCreateGate {
    private var createArrived = false
    private var waiters: [CheckedContinuation<Void, Never>] = []
    private var releaseWaiters: [CheckedContinuation<Void, Never>] = []
    private var isReleased = false

    func arriveAndWait() async {
        createArrived = true
        waiters.forEach { $0.resume() }
        waiters.removeAll()
        if isReleased { return }
        await withCheckedContinuation { releaseWaiters.append($0) }
    }

    func waitForCreate() async {
        if createArrived { return }
        await withCheckedContinuation { waiters.append($0) }
    }

    func releaseCreate() {
        isReleased = true
        releaseWaiters.forEach { $0.resume() }
        releaseWaiters.removeAll()
    }
}

private actor QuickSaveGate {
    private var saveArrived = false
    private var waiters: [CheckedContinuation<Void, Never>] = []
    private var releaseWaiters: [CheckedContinuation<Void, Never>] = []
    private var isReleased = false

    func arriveAndWait() async {
        saveArrived = true
        waiters.forEach { $0.resume() }
        waiters.removeAll()
        if isReleased { return }
        await withCheckedContinuation { releaseWaiters.append($0) }
    }

    func waitForSave() async {
        if saveArrived { return }
        await withCheckedContinuation { waiters.append($0) }
    }

    func release() {
        isReleased = true
        releaseWaiters.forEach { $0.resume() }
        releaseWaiters.removeAll()
    }
}

private enum QuickSaveAPIError: Error { case unavailable }

private extension DrinkSaverAPI {
    func editRecommendations(_ edits: [RecommendationEdit]) async throws -> [Recommendation] { [] }
    func deleteRecommendation(id: Int) async throws {}
    func alcoholTypes() async throws -> [AlcoholType] { [] }
    func createAlcoholType(_ entry: NewAlcoholEntry) async throws -> AlcoholType { throw QuickSaveAPIError.unavailable }
    func volumes(alcoholTypeID: Int) async throws -> [AlcoholVolume] { [] }
    func createVolume(alcoholTypeID: Int, entry: NewVolumeEntry) async throws -> AlcoholVolume { throw QuickSaveAPIError.unavailable }
    func subtypes(alcoholTypeID: Int) async throws -> [AlcoholSubtype] { [] }
    func createSubtype(alcoholTypeID: Int, entry: NewAlcoholSubtype) async throws -> AlcoholSubtype { throw QuickSaveAPIError.unavailable }
    func consumptionTypes(amount: Int) async throws -> [ConsumptionType] { [] }
    func brands() async throws -> [Brand] { [] }
    func createBrand(_ entry: NewBeerBrand) async throws -> Brand { throw QuickSaveAPIError.unavailable }
    func flavours(brandID: Int) async throws -> [BeerFlavour] { [] }
    func createFlavour(brandID: Int, entry: NewBeerFlavour) async throws -> BeerFlavour { throw QuickSaveAPIError.unavailable }
}
