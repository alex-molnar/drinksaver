#if UI_TESTING
import SwiftUI

@MainActor
struct UITestFixtureBootstrap {
    let fixture: UITestFixture
    let sessionStore: SessionStore
    let api: any DrinkSaverAPI
    let clock: any Clock

    static func launchIfRequested(arguments: [String]) -> UITestFixtureBootstrap? {
        guard let fixture = UITestFixture.parse(arguments: arguments) else { return nil }
        return UITestFixtureBootstrap(fixture: fixture)
    }

    private init(fixture: UITestFixture) {
        self.fixture = fixture
        let authorization = FixtureAuthorizationProvider()
        sessionStore = SessionStore(authorizationProvider: authorization)
        api = FixtureAPI(fails: fixture.identifier == "signed-in-api-failure")
        clock = FixtureClock(now: fixture.fixedNow)
    }
}

private struct FixtureClock: Clock {
    let now: Date
}

@MainActor
private final class FixtureAuthorizationProvider: AuthorizationProviding {
    var subject: String? { "ui-fixture-user" }

    func restore() async throws -> Bool { true }
    func signIn() async throws {}
    func signOut() async throws {}
    func resume(url: URL) -> Bool { false }
    func accessToken(forceRefresh: Bool) async throws -> String { "ui-fixture-access-token" }
}

private actor FixtureAPI: DrinkSaverAPI {
    private let fails: Bool

    init(fails: Bool) { self.fails = fails }

    func palettes() async throws -> [Palette] {
        if fails { throw FixtureAPIError.unavailable }
        return [Palette(id: 101, name: "fixture-cream", field: "#DFD1B0", inkLight: nil, inkDark: "#2B1A14")]
    }

    func glassware() async throws -> [Glassware] {
        if fails { throw FixtureAPIError.unavailable }
        return [Glassware(id: 201, name: "fixture-highball", g: "M10 4h14v39H10Z", l: "M11 13h12v29H11Z", f: nil)]
    }
}

private enum FixtureAPIError: Error {
    case unavailable
    case endpointNotConfigured
}

private extension DrinkSaverAPI {
    func saveDrink(_ request: DrinkSaveRequest) async throws -> [SavedDrink] { throw FixtureAPIError.endpointNotConfigured }
    func recommendations() async throws -> [Recommendation] { throw FixtureAPIError.endpointNotConfigured }
    func editRecommendations(_ edits: [RecommendationEdit]) async throws -> [Recommendation] { throw FixtureAPIError.endpointNotConfigured }
    func deleteRecommendation(id: Int) async throws { throw FixtureAPIError.endpointNotConfigured }
    func alcoholTypes() async throws -> [AlcoholType] { throw FixtureAPIError.endpointNotConfigured }
    func createAlcoholType(_ entry: NewAlcoholEntry) async throws -> AlcoholType { throw FixtureAPIError.endpointNotConfigured }
    func volumes(alcoholTypeID: Int) async throws -> [AlcoholVolume] { throw FixtureAPIError.endpointNotConfigured }
    func createVolume(alcoholTypeID: Int, entry: NewVolumeEntry) async throws -> AlcoholVolume { throw FixtureAPIError.endpointNotConfigured }
    func subtypes(alcoholTypeID: Int) async throws -> [AlcoholSubtype] { throw FixtureAPIError.endpointNotConfigured }
    func createSubtype(alcoholTypeID: Int, entry: NewAlcoholSubtype) async throws -> AlcoholSubtype { throw FixtureAPIError.endpointNotConfigured }
    func consumptionTypes(amount: Int) async throws -> [ConsumptionType] { throw FixtureAPIError.endpointNotConfigured }
    func brands() async throws -> [Brand] { throw FixtureAPIError.endpointNotConfigured }
    func createBrand(_ entry: NewBeerBrand) async throws -> Brand { throw FixtureAPIError.endpointNotConfigured }
    func flavours(brandID: Int) async throws -> [BeerFlavour] { throw FixtureAPIError.endpointNotConfigured }
    func createFlavour(brandID: Int, entry: NewBeerFlavour) async throws -> BeerFlavour { throw FixtureAPIError.endpointNotConfigured }
    func drinks(date: String) async throws -> [EditableDrink] { throw FixtureAPIError.endpointNotConfigured }
    func deleteDrinks(ids: [Int]) async throws -> Int { throw FixtureAPIError.endpointNotConfigured }
}

private struct FixtureAPIEnvironmentKey: EnvironmentKey {
    static let defaultValue: (any DrinkSaverAPI)? = nil
}

private struct FixtureClockEnvironmentKey: EnvironmentKey {
    static let defaultValue: (any Clock) = SystemClock()
}

private struct FixtureIdentifierEnvironmentKey: EnvironmentKey {
    static let defaultValue: String? = nil
}

private struct FixtureReduceMotionEnvironmentKey: EnvironmentKey {
    static let defaultValue: Bool? = nil
}

extension EnvironmentValues {
    var uiFixtureAPI: (any DrinkSaverAPI)? {
        get { self[FixtureAPIEnvironmentKey.self] }
        set { self[FixtureAPIEnvironmentKey.self] = newValue }
    }

    var uiFixtureClock: any Clock {
        get { self[FixtureClockEnvironmentKey.self] }
        set { self[FixtureClockEnvironmentKey.self] = newValue }
    }

    var uiFixtureIdentifier: String? {
        get { self[FixtureIdentifierEnvironmentKey.self] }
        set { self[FixtureIdentifierEnvironmentKey.self] = newValue }
    }

    var uiFixtureReduceMotion: Bool? {
        get { self[FixtureReduceMotionEnvironmentKey.self] }
        set { self[FixtureReduceMotionEnvironmentKey.self] = newValue }
    }
}
#endif
