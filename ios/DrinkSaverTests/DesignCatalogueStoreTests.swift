import XCTest
@testable import DrinkSaver

@MainActor
final class DesignCatalogueStoreTests: XCTestCase {
    func testFetchesPalettesAndGlasswareInParallel() async {
        let gate = FetchGate()
        let api = ControlledDesignAPI(gate: gate)
        let store = await makeStore(api: api)

        let load = Task { await store.load() }
        await gate.waitForBothRequests()
        XCTAssertEqual(store.state, .loading)
        await gate.releaseRequests()
        await load.value

        XCTAssertEqual(store.state, .ready)
        XCTAssertEqual(store.catalogue.palettes, [palette(7, "server")])
        XCTAssertEqual(store.catalogue.glassware, [glassware(9, "server-glass")])
    }

    func testPartialFailureKeepsSuccessfulEndpointAndUsesFallbackForFailedEndpoint() async {
        let api = ControlledDesignAPI(paletteFailure: true)
        let store = await makeStore(api: api)

        await store.load()

        XCTAssertEqual(store.state, .failed)
        XCTAssertEqual(store.catalogue.palette(id: 7), DesignCatalogue.fallbackPalette)
        XCTAssertEqual(store.catalogue.glass(id: 9), glassware(9, "server-glass"))
    }

    func testTotalFailureUsesFallbackAndRetryLoadsFreshCatalogue() async {
        let api = ControlledDesignAPI(paletteFailure: true, glasswareFailure: true)
        let store = await makeStore(api: api)

        await store.load()

        XCTAssertEqual(store.state, .failed)
        XCTAssertEqual(store.catalogue.palette(id: 999), DesignCatalogue.fallbackPalette)
        XCTAssertEqual(store.catalogue.glass(id: 999), DesignCatalogue.fallbackGlass)

        await api.setFailures(palettes: false, glassware: false)
        await store.retry()

        XCTAssertEqual(store.state, .ready)
        XCTAssertEqual(store.catalogue.palette(id: 7), palette(7, "server"))
    }

    func testUnknownIDsResolveToFrozenFallbackWhileLoading() async {
        let gate = FetchGate()
        let store = await makeStore(api: ControlledDesignAPI(gate: gate))
        let load = Task { await store.load() }

        await gate.waitForBothRequests()
        XCTAssertEqual(store.catalogue.palette(id: 999), DesignCatalogue.fallbackPalette)
        XCTAssertEqual(store.catalogue.glass(id: 999), DesignCatalogue.fallbackGlass)
        await gate.releaseRequests()
        await load.value
    }

    func testLateResponsesAfterLogoutAreDiscarded() async {
        let gate = FetchGate()
        let api = ControlledDesignAPI(gate: gate)
        let session = await makeSession(subject: "account-a")
        let store = DesignCatalogueStore(api: api, sessionStore: session)
        let load = Task { await store.load() }

        await gate.waitForBothRequests()
        await session.signOut()
        store.sessionDidSignOut()
        await gate.releaseRequests()
        await load.value

        XCTAssertEqual(store.state, .idle)
        XCTAssertEqual(store.catalogue.palette(id: 999), DesignCatalogue.fallbackPalette)
        XCTAssertEqual(store.catalogue.glass(id: 999), DesignCatalogue.fallbackGlass)
    }

    func testDifferentAuthenticatedSubjectGetsAFreshCatalogue() async {
        let provider = TestAuthorizationProvider(subject: "account-a")
        let session = SessionStore(authorizationProvider: provider)
        await session.restore()
        let api = ControlledDesignAPI()
        let store = DesignCatalogueStore(api: api, sessionStore: session)

        await store.load()
        XCTAssertEqual(store.catalogue.palette(id: 7), palette(7, "server"))
        await api.setPalettes([palette(8, "account-b")])
        provider.subject = "account-b"
        await store.load()

        XCTAssertEqual(store.catalogue.palette(id: 8), palette(8, "account-b"))
        let requestCount = await api.paletteRequestCount()
        XCTAssertEqual(requestCount, 2)
    }

    private func makeStore(api: any DesignCatalogueLoading) async -> DesignCatalogueStore {
        DesignCatalogueStore(api: api, sessionStore: await makeSession(subject: "account-a"))
    }

    private func makeSession(subject: String) async -> SessionStore {
        let session = SessionStore(authorizationProvider: TestAuthorizationProvider(subject: subject))
        await session.restore()
        return session
    }

    private func palette(_ id: Int, _ name: String) -> Palette {
        Palette(id: id, name: name, field: "#123456", inkLight: nil, inkDark: "#000000")
    }

    private func glassware(_ id: Int, _ name: String) -> Glassware {
        Glassware(id: id, name: name, g: "M0 0", l: "M1 1", f: nil)
    }
}

@MainActor
private final class TestAuthorizationProvider: AuthorizationProviding {
    var subject: String?
    init(subject: String?) { self.subject = subject }
    func restore() async throws -> Bool { subject != nil }
    func signIn() async throws {}
    func signOut() async throws { subject = nil }
    func resume(url: URL) -> Bool { false }
    func accessToken(forceRefresh: Bool) async throws -> String { "test-token" }
}

private actor ControlledDesignAPI: DesignCatalogueLoading {
    private var palettes: [Palette] = [Palette(id: 7, name: "server", field: "#123456", inkLight: nil, inkDark: "#000000")]
    private var glasses: [Glassware] = [Glassware(id: 9, name: "server-glass", g: "M0 0", l: "M1 1", f: nil)]
    private var failsPalettes: Bool
    private var failsGlassware: Bool
    private var paletteCount = 0
    private let gate: FetchGate?

    init(paletteFailure: Bool = false, glasswareFailure: Bool = false, gate: FetchGate? = nil) {
        failsPalettes = paletteFailure
        failsGlassware = glasswareFailure
        self.gate = gate
    }

    func palettes() async throws -> [Palette] {
        paletteCount += 1
        await gate?.arriveAndWait()
        if failsPalettes { throw TestAPIError.unavailable }
        return palettes
    }

    func glassware() async throws -> [Glassware] {
        await gate?.arriveAndWait()
        if failsGlassware { throw TestAPIError.unavailable }
        return glasses
    }

    func setFailures(palettes: Bool, glassware: Bool) {
        failsPalettes = palettes
        failsGlassware = glassware
    }

    func setPalettes(_ palettes: [Palette]) { self.palettes = palettes }
    func paletteRequestCount() -> Int { paletteCount }
}

private actor FetchGate {
    private var arrivals = 0
    private var arrivalWaiters: [CheckedContinuation<Void, Never>] = []
    private var requestWaiters: [CheckedContinuation<Void, Never>] = []
    private var isReleased = false

    func arriveAndWait() async {
        arrivals += 1
        if arrivals == 2 {
            let waiters = arrivalWaiters
            arrivalWaiters.removeAll()
            waiters.forEach { $0.resume() }
        }
        if isReleased { return }
        await withCheckedContinuation { requestWaiters.append($0) }
    }

    func waitForBothRequests() async {
        if arrivals == 2 { return }
        await withCheckedContinuation { arrivalWaiters.append($0) }
    }

    func releaseRequests() {
        isReleased = true
        let waiters = requestWaiters
        requestWaiters.removeAll()
        waiters.forEach { $0.resume() }
    }
}

private enum TestAPIError: Error { case unavailable }
