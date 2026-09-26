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
                         saveFails: fixture.identifier == "signed-in-save-failure",
                         referenceState: fixture.referenceState)
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
    private let referenceState: String?
    private var nextDrinkID = 401
    private var nextCatalogueID = 20
    private var recommendationRows: [Recommendation] = []
    private static let referenceRecommendations = [
        Recommendation(id: 1, userId: "ui-fixture-user", name: "Heineken pint", alcoholTypeId: 4,
                       alcoholSubtypeId: nil, alcoholVolumeId: 6, brandId: 1, beerFlavourId: 1,
                       consumptionTypeId: 3, endDate: nil, colorPaletteId: 1, glasswareId: 1, orderNumber: 0),
        Recommendation(id: 2, userId: "ui-fixture-user", name: "Guinness pint", alcoholTypeId: 4,
                       alcoholSubtypeId: nil, alcoholVolumeId: 6, brandId: 2, beerFlavourId: 3,
                       consumptionTypeId: 3, endDate: nil, colorPaletteId: 2, glasswareId: 1, orderNumber: 1),
        Recommendation(id: 3, userId: "ui-fixture-user", name: "Duvel bottle", alcoholTypeId: 4,
                       alcoholSubtypeId: nil, alcoholVolumeId: 5, brandId: 3, beerFlavourId: 4,
                       consumptionTypeId: 1, endDate: nil, colorPaletteId: 7, glasswareId: 11, orderNumber: 2),
        Recommendation(id: 4, userId: "ui-fixture-user", name: "Chouffe bottle", alcoholTypeId: 4,
                       alcoholSubtypeId: nil, alcoholVolumeId: 5, brandId: 4, beerFlavourId: 5,
                       consumptionTypeId: 1, endDate: nil, colorPaletteId: 4, glasswareId: 11, orderNumber: 3),
        Recommendation(id: 5, userId: "ui-fixture-user", name: "Gin and tonic", alcoholTypeId: 1,
                       alcoholSubtypeId: 1, alcoholVolumeId: 2, brandId: nil, beerFlavourId: nil,
                       consumptionTypeId: nil, endDate: nil, colorPaletteId: 1, glasswareId: 4, orderNumber: 4),
        Recommendation(id: 6, userId: "ui-fixture-user", name: "Glass of red", alcoholTypeId: 2,
                       alcoholSubtypeId: 4, alcoholVolumeId: 4, brandId: nil, beerFlavourId: nil,
                       consumptionTypeId: nil, endDate: nil, colorPaletteId: 4, glasswareId: 3, orderNumber: 5)
    ]

    init(fails: Bool, saveFails: Bool, referenceState: String? = nil) {
        self.fails = fails
        self.saveFails = saveFails
        self.referenceState = referenceState
        recommendationRows = referenceState == nil ? [
            Recommendation(id: nil, userId: "ui-fixture-user", name: "Golden lager", alcoholTypeId: 4,
                           alcoholSubtypeId: nil, alcoholVolumeId: 6, brandId: nil, beerFlavourId: nil,
                           consumptionTypeId: nil, endDate: nil, colorPaletteId: 101, glasswareId: 201, orderNumber: 0),
            Recommendation(id: 9, userId: "ui-fixture-user", name: "House pilsner", alcoholTypeId: 3,
                           alcoholSubtypeId: nil, alcoholVolumeId: 5, brandId: 7, beerFlavourId: nil,
                           consumptionTypeId: nil, endDate: nil, colorPaletteId: 101, glasswareId: 201, orderNumber: 1),
            Recommendation(id: 10, userId: "ui-fixture-user", name: "Amber ale", alcoholTypeId: 4,
                           alcoholSubtypeId: nil, alcoholVolumeId: 6, brandId: nil, beerFlavourId: nil,
                           consumptionTypeId: nil, endDate: nil, colorPaletteId: 101, glasswareId: 201, orderNumber: 2)
        ] : referenceState == "recs-empty" ? [] : Self.referenceRecommendations
    }

    func palettes() async throws -> [Palette] {
        if fails { throw FixtureAPIError.unavailable }
        return [
            Palette(id: 1, name: "green", field: "#2B7454", inkLight: "#FFF6E3", inkDark: "#F4E9CE"),
            Palette(id: 2, name: "brown", field: "#2B1A13", inkLight: "#FFF3DA", inkDark: "#EBD9B4"),
            Palette(id: 3, name: "cream", field: "#DFD1B0", inkLight: "#3B241B", inkDark: "#2B1A14"),
            Palette(id: 4, name: "red", field: "#BA422C", inkLight: "#FFF4DB", inkDark: "#F9EDD4"),
            Palette(id: 5, name: "blue", field: "#2C4B6E", inkLight: "#FFF2D8", inkDark: "#EFE2C8"),
            Palette(id: 6, name: "plum", field: "#6B3350", inkLight: "#FFF0DD", inkDark: "#F2E4CE"),
            Palette(id: 7, name: "amber", field: "#C9973B", inkLight: "#342016", inkDark: "#2B1A14"),
            Palette(id: 8, name: "rose", field: "#D4A0A7", inkLight: "#3B211C", inkDark: "#2B1A14")
        ]
    }

    func glassware() async throws -> [Glassware] {
        if fails { throw FixtureAPIError.unavailable }
        return [
            Glassware(id: 1, name: "pint", g: "M8 5h18l-2.2 40a3 3 0 0 1-3 2.6h-7.6a3 3 0 0 1-3-2.6Z", l: "M9.5 15h15l-1.85 29.4a1.5 1.5 0 0 1-1.5 1.3h-8.3a1.5 1.5 0 0 1-1.5-1.3Z", f: "M8.7 8.4h16.6l-.42 6.6H9.12Z"),
            Glassware(id: 3, name: "wine", g: "M8 5c0 12 2 17.2 9 19.6 7-2.4 9-7.6 9-19.6Z M16.1 24.6h1.8v16.6h-1.8Z M9.8 43.9h14.4v3H9.8Z", l: "M9.7 12.6c.75 6.5 2.7 9.9 7.3 11.7 4.6-1.8 6.55-5.2 7.3-11.7Z", f: nil),
            Glassware(id: 4, name: "highball", g: "M10 4h14v39a3 3 0 0 1-3 3h-8a3 3 0 0 1-3-3Z", l: "M11.4 13.6h11.2v28.9a1.5 1.5 0 0 1-1.5 1.4h-8.2a1.5 1.5 0 0 1-1.5-1.4Z", f: nil),
            Glassware(id: 11, name: "beerbottle", g: "M 14.5 7 h 5 A 4 2 0 0 1 19 8 L 20 15 c 1 2 2 3 3 6 c 0.5 3 0.5 4 0.5 10 v 12 a 3 3 0 0 1 -3 3 H 12 a 3 3 0 0 1 -1.5 -3 V 31 c 0 -4 0 -7 0.5 -10 c 1 -3 2 -4 3 -6 L 15 8 A 4 2 0 0 1 14.5 7 L 14 7 C 14.2 6.2 14.2 6.2 15 6 H 19 C 19.8 6.2 19.8 6.2 20 7 Z M 12 29 h 10 M 12 39 h 10", l: "M11 26h12v17a2 2 0 0 1-2 2h-8a2 2 0 0 1-2-2Z", f: nil)
        ]
    }

    func drinks(date: String) async throws -> [EditableDrink] {
        if fails { throw FixtureAPIError.unavailable }
        if referenceState == "history-empty" { return [] }
        if referenceState == "history-populated" {
            return [
                EditableDrink(id: 1, name: "Heineken pint (Draft/Tap - 0.50l)", alcoholTypeId: 4),
                EditableDrink(id: 2, name: "Heineken pint (Draft/Tap - 0.50l)", alcoholTypeId: 4),
                EditableDrink(id: 3, name: "Duvel bottle (Bottle - 0.33l)", alcoholTypeId: 4),
                EditableDrink(id: 4, name: "Glass of red (Large glass - 0.30l)", alcoholTypeId: 2)
            ]
        }
        if referenceState != nil { return [] }
        return [
            EditableDrink(id: 301, name: "Fixture drink one", alcoholTypeId: 1),
            EditableDrink(id: 302, name: "Fixture drink two", alcoholTypeId: 1)
        ]
    }

    func recommendations() async throws -> [Recommendation] {
        if fails { throw FixtureAPIError.unavailable }
        if referenceState == "quick-loading" { try await Task.sleep(for: .seconds(60)) }
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
        return [AlcoholType(id: 1, userId: nil, name: "Spirits", volumeIds: [1, 2], colorPaletteId: 1, glasswareId: 4),
                AlcoholType(id: 2, userId: nil, name: "Wine", volumeIds: [3, 4, 7], colorPaletteId: 4, glasswareId: 3),
                AlcoholType(id: 3, userId: nil, name: "Cocktail", volumeIds: [2, 4], colorPaletteId: 6, glasswareId: 4),
                AlcoholType(id: 4, userId: nil, name: "Beer", volumeIds: [3, 5, 6], colorPaletteId: 7, glasswareId: 1)]
    }
    func volumes(alcoholTypeID: Int) async throws -> [AlcoholVolume] {
        if fails { throw FixtureAPIError.unavailable }
        return [AlcoholVolume(id: 1, name: "Shot", volume: 0.04), AlcoholVolume(id: 2, name: "Long drink", volume: 0.25),
                AlcoholVolume(id: 3, name: "Small glass", volume: 0.2), AlcoholVolume(id: 4, name: "Large glass", volume: 0.3),
                AlcoholVolume(id: 5, name: "Small bottle", volume: 0.33), AlcoholVolume(id: 6, name: "Pint", volume: 0.5),
                AlcoholVolume(id: 7, name: "Bottle", volume: 0.75)]
    }
    func subtypes(alcoholTypeID: Int) async throws -> [AlcoholSubtype] {
        [AlcoholSubtype(id: 1, alcoholTypeId: 1, userId: nil, name: "Gin", colorPaletteId: nil, glasswareId: nil),
         AlcoholSubtype(id: 2, alcoholTypeId: 1, userId: nil, name: "Whisky", colorPaletteId: nil, glasswareId: nil),
         AlcoholSubtype(id: 4, alcoholTypeId: 2, userId: nil, name: "Red", colorPaletteId: 4, glasswareId: 3),
         AlcoholSubtype(id: 5, alcoholTypeId: 2, userId: nil, name: "White", colorPaletteId: nil, glasswareId: 3)]
    }
    func consumptionTypes(amount: Int) async throws -> [ConsumptionType] {
        [ConsumptionType(id: 1, name: "Bottle", glasswareId: 11), ConsumptionType(id: 2, name: "Can", glasswareId: 1),
         ConsumptionType(id: 3, name: "Draft/Tap", glasswareId: 1)]
    }
    func brands() async throws -> [Brand] {
        [Brand(id: 1, userId: nil, name: "Heineken", colorPaletteId: 1), Brand(id: 2, userId: nil, name: "Guinness", colorPaletteId: 2),
         Brand(id: 3, userId: nil, name: "Duvel", colorPaletteId: 7), Brand(id: 4, userId: nil, name: "La Chouffe", colorPaletteId: 4)]
    }
    func flavours(brandID: Int) async throws -> [BeerFlavour] {
        [BeerFlavour(id: 1, brandId: 1, userId: nil, name: "Original", colorPaletteId: nil),
         BeerFlavour(id: 3, brandId: 2, userId: nil, name: "Draught", colorPaletteId: nil),
         BeerFlavour(id: 4, brandId: 3, userId: nil, name: "Blond", colorPaletteId: nil),
         BeerFlavour(id: 5, brandId: 4, userId: nil, name: "Blonde", colorPaletteId: nil)]
    }
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
