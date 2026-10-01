import Foundation

@MainActor
protocol AccessTokenProviding: Sendable {
    func accessToken(forceRefresh: Bool) async throws -> String
}

protocol DesignCatalogueLoading: Sendable {
    func palettes() async throws -> [Palette]
    func glassware() async throws -> [Glassware]
}

protocol DrinkQueueAPI: Sendable {
    func saveDrink(_ request: DrinkSaveRequest) async throws -> [SavedDrink]
    func drinks(date: String) async throws -> [EditableDrink]
    func deleteDrinks(ids: [Int]) async throws -> Int
}

protocol DrinkSaverAPI: DesignCatalogueLoading, DrinkQueueAPI {
    func recommendations() async throws -> [Recommendation]
    func editRecommendations(_ edits: [RecommendationEdit]) async throws -> [Recommendation]
    func deleteRecommendation(id: Int) async throws
    func alcoholTypes() async throws -> [AlcoholType]
    func createAlcoholType(_ entry: NewAlcoholEntry) async throws -> AlcoholType
    func volumes(alcoholTypeID: Int) async throws -> [AlcoholVolume]
    func createVolume(alcoholTypeID: Int, entry: NewVolumeEntry) async throws -> AlcoholVolume
    func subtypes(alcoholTypeID: Int) async throws -> [AlcoholSubtype]
    func createSubtype(alcoholTypeID: Int, entry: NewAlcoholSubtype) async throws -> AlcoholSubtype
    func consumptionTypes(amount: Int) async throws -> [ConsumptionType]
    func brands() async throws -> [Brand]
    func createBrand(_ entry: NewBeerBrand) async throws -> Brand
    func flavours(brandID: Int) async throws -> [BeerFlavour]
    func createFlavour(brandID: Int, entry: NewBeerFlavour) async throws -> BeerFlavour
}
