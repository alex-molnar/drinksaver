#if UI_TESTING
import SwiftUI

@MainActor
struct UITestFixtureBootstrap {
    let fixture: UITestFixture
    let sessionStore: SessionStore
    let api: any DrinkSaverAPI
    let clock: any Clock

    static func launchIfRequested(arguments: [String]) -> UITestFixtureBootstrap? {
        let fixture: UITestFixture?
        do {
            fixture = try UITestFixture.parse(arguments: arguments)
        } catch {
            fatalError("Invalid UI fixture arguments: \(error)")
        }
        guard let fixture else { return nil }
        return UITestFixtureBootstrap(fixture: fixture)
    }

    private init(fixture: UITestFixture) {
        self.fixture = fixture
        let authorization = FixtureAuthorizationProvider()
        sessionStore = SessionStore(authorizationProvider: authorization)
        api = FixtureAPI(fails: fixture.identifier == "signed-in-api-failure",
                         saveFails: fixture.identifier == "signed-in-save-failure")
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
    private let saveFails: Bool
    private var nextDrinkID = 401
    private var nextCatalogueID = 20
    private var recommendationRows: [Recommendation] = []

    init(fails: Bool, saveFails: Bool) {
        self.fails = fails
        self.saveFails = saveFails
        recommendationRows = [
            Recommendation(id: nil, userId: "ui-fixture-user", name: "Golden lager", alcoholTypeId: 4,
                           alcoholSubtypeId: nil, alcoholVolumeId: 6, brandId: nil, beerFlavourId: nil,
                           consumptionTypeId: nil, endDate: nil, colorPaletteId: 101, glasswareId: 201, orderNumber: 0),
            Recommendation(id: 9, userId: "ui-fixture-user", name: "House pilsner", alcoholTypeId: 3,
                           alcoholSubtypeId: nil, alcoholVolumeId: 5, brandId: 7, beerFlavourId: nil,
                           consumptionTypeId: nil, endDate: nil, colorPaletteId: 101, glasswareId: 201, orderNumber: 1),
            Recommendation(id: 10, userId: "ui-fixture-user", name: "Amber ale", alcoholTypeId: 4,
                           alcoholSubtypeId: nil, alcoholVolumeId: 6, brandId: nil, beerFlavourId: nil,
                           consumptionTypeId: nil, endDate: nil, colorPaletteId: 101, glasswareId: 201, orderNumber: 2)
        ]
    }

    func palettes() async throws -> [Palette] {
        if fails { throw FixtureAPIError.unavailable }
        return [Palette(id: 101, name: "fixture-cream", field: "#DFD1B0", inkLight: nil, inkDark: "#2B1A14")]
    }

    func glassware() async throws -> [Glassware] {
        if fails { throw FixtureAPIError.unavailable }
        return [Glassware(id: 201, name: "fixture-highball", g: "M10 4h14v39H10Z", l: "M11 13h12v29H11Z", f: nil)]
    }

    func drinks(date: String) async throws -> [EditableDrink] {
        if fails { throw FixtureAPIError.unavailable }
        return [
            EditableDrink(id: 301, name: "Fixture drink one", alcoholTypeId: 1),
            EditableDrink(id: 302, name: "Fixture drink two", alcoholTypeId: 1)
        ]
    }

    func recommendations() async throws -> [Recommendation] {
        if fails { throw FixtureAPIError.unavailable }
        return recommendationRows
    }

    func editRecommendations(_ edits: [RecommendationEdit]) async throws -> [Recommendation] {
        if fails { throw FixtureAPIError.unavailable }
        for (index, edit) in edits.enumerated() {
            guard let row = recommendationRows.firstIndex(where: { $0.id == edit.id }) else { continue }
            let existing = recommendationRows[row]
            recommendationRows[row] = Recommendation(id: existing.id, userId: existing.userId, name: edit.name,
                alcoholTypeId: existing.alcoholTypeId, alcoholSubtypeId: existing.alcoholSubtypeId,
                alcoholVolumeId: existing.alcoholVolumeId, brandId: existing.brandId, beerFlavourId: existing.beerFlavourId,
                consumptionTypeId: existing.consumptionTypeId, endDate: existing.endDate,
                colorPaletteId: existing.colorPaletteId, glasswareId: existing.glasswareId, orderNumber: index)
        }
        return recommendationRows
    }

    func deleteRecommendation(id: Int) async throws {
        if fails { throw FixtureAPIError.unavailable }
        recommendationRows.removeAll { $0.id == id }
    }

    func saveDrink(_ request: DrinkSaveRequest) async throws -> [SavedDrink] {
        if fails || saveFails { throw FixtureAPIError.unavailable }
        defer { nextDrinkID += 1 }
        return [SavedDrink(id: nextDrinkID, userId: "ui-fixture-user", date: request.date ?? "",
                           alcoholTypeId: request.alcoholTypeId, alcoholSubtypeId: request.alcoholSubtypeId,
                           alcoholVolumeId: request.alcoholVolumeId, brandId: request.brandId,
                           beerFlavourId: request.beerFlavourId, consumptionTypeId: request.consumptionTypeId,
                           colorPaletteId: request.colorPaletteId, glasswareId: request.glasswareId, comments: nil)]
    }

    func alcoholTypes() async throws -> [AlcoholType] {
        if fails { throw FixtureAPIError.unavailable }
        return [AlcoholType(id: 1, userId: nil, name: "Wine", volumeIds: [2], colorPaletteId: 101, glasswareId: 201),
                AlcoholType(id: 4, userId: nil, name: "Beer", volumeIds: [6], colorPaletteId: 101, glasswareId: 201)]
    }
    func volumes(alcoholTypeID: Int) async throws -> [AlcoholVolume] {
        if fails { throw FixtureAPIError.unavailable }
        return [AlcoholVolume(id: alcoholTypeID == 4 ? 6 : 2, name: "Glass", volume: 0.25)]
    }
    func subtypes(alcoholTypeID: Int) async throws -> [AlcoholSubtype] { [] }
    func consumptionTypes(amount: Int) async throws -> [ConsumptionType] {
        [ConsumptionType(id: 3, name: "Served", glasswareId: 201)]
    }
    func brands() async throws -> [Brand] { [Brand(id: 7, userId: nil, name: "Fixture brand", colorPaletteId: 101)] }
    func flavours(brandID: Int) async throws -> [BeerFlavour] { [BeerFlavour(id: 8, brandId: brandID, userId: nil, name: "Pilsner", colorPaletteId: 101)] }
    func createAlcoholType(_ entry: NewAlcoholEntry) async throws -> AlcoholType {
        defer { nextCatalogueID += 1 }
        return AlcoholType(id: nextCatalogueID, userId: "ui-fixture-user", name: entry.name, volumeIds: [], colorPaletteId: entry.colorPaletteId ?? 101, glasswareId: entry.glasswareId ?? 201)
    }
    func createVolume(alcoholTypeID: Int, entry: NewVolumeEntry) async throws -> AlcoholVolume {
        defer { nextCatalogueID += 1 }; return AlcoholVolume(id: nextCatalogueID, name: entry.name, volume: entry.volume)
    }
    func createSubtype(alcoholTypeID: Int, entry: NewAlcoholSubtype) async throws -> AlcoholSubtype {
        defer { nextCatalogueID += 1 }; return AlcoholSubtype(id: nextCatalogueID, alcoholTypeId: alcoholTypeID, userId: "ui-fixture-user", name: entry.name, colorPaletteId: entry.colorPaletteId, glasswareId: entry.glasswareId)
    }
    func createBrand(_ entry: NewBeerBrand) async throws -> Brand {
        defer { nextCatalogueID += 1 }; return Brand(id: nextCatalogueID, userId: "ui-fixture-user", name: entry.name, colorPaletteId: entry.colorPaletteId)
    }
    func createFlavour(brandID: Int, entry: NewBeerFlavour) async throws -> BeerFlavour {
        defer { nextCatalogueID += 1 }; return BeerFlavour(id: nextCatalogueID, brandId: brandID, userId: "ui-fixture-user", name: entry.name, colorPaletteId: entry.colorPaletteId)
    }

    func deleteDrinks(ids: [Int]) async throws -> Int { ids.count }
}

private enum FixtureAPIError: Error {
    case unavailable
    case endpointNotConfigured
}

private extension DrinkSaverAPI {
    func saveDrink(_ request: DrinkSaveRequest) async throws -> [SavedDrink] { throw FixtureAPIError.endpointNotConfigured }
    func recommendations() async throws -> [Recommendation] { throw FixtureAPIError.endpointNotConfigured }
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
