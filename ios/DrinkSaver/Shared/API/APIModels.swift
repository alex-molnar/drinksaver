import Foundation

struct DrinkSaveRequest: Codable, Equatable, Sendable {
    let date: String?
    let alcoholTypeId: Int
    let alcoholSubtypeId: Int?
    let alcoholVolumeId: Int
    let brandId: Int?
    let beerFlavourId: Int?
    let consumptionTypeId: Int?
    let colorPaletteId: Int?
    let glasswareId: Int?
    let comments: String?
    let quantity: Int?
    let addToRecommendations: Bool?
    let onlyTemporarily: Bool?
    let name: String?

    init(
        date: String? = nil,
        alcoholTypeId: Int,
        alcoholSubtypeId: Int? = nil,
        alcoholVolumeId: Int,
        brandId: Int? = nil,
        beerFlavourId: Int? = nil,
        consumptionTypeId: Int? = nil,
        colorPaletteId: Int? = nil,
        glasswareId: Int? = nil,
        comments: String? = nil,
        quantity: Int? = nil,
        addToRecommendations: Bool? = nil,
        onlyTemporarily: Bool? = nil,
        name: String? = nil
    ) {
        self.date = date
        self.alcoholTypeId = alcoholTypeId
        self.alcoholSubtypeId = alcoholSubtypeId
        self.alcoholVolumeId = alcoholVolumeId
        self.brandId = brandId
        self.beerFlavourId = beerFlavourId
        self.consumptionTypeId = consumptionTypeId
        self.colorPaletteId = colorPaletteId
        self.glasswareId = glasswareId
        self.comments = comments
        self.quantity = quantity
        self.addToRecommendations = addToRecommendations
        self.onlyTemporarily = onlyTemporarily
        self.name = name
    }
}

struct SavedDrink: Codable, Equatable, Sendable {
    let id: Int
    let userId: String
    let date: String
    let alcoholTypeId: Int?
    let alcoholSubtypeId: Int?
    let alcoholVolumeId: Int?
    let brandId: Int?
    let beerFlavourId: Int?
    let consumptionTypeId: Int?
    let colorPaletteId: Int?
    let glasswareId: Int?
    let comments: String?
}

struct Recommendation: Codable, Equatable, Sendable {
    let id: Int?
    let userId: String
    let name: String
    let alcoholTypeId: Int?
    let alcoholSubtypeId: Int?
    let alcoholVolumeId: Int?
    let brandId: Int?
    let beerFlavourId: Int?
    let consumptionTypeId: Int?
    let endDate: String?
    let colorPaletteId: Int?
    let glasswareId: Int?
    let orderNumber: Int?
}

struct RecommendationEdit: Codable, Equatable, Sendable {
    let id: Int
    let name: String
}

struct AlcoholType: Codable, Equatable, Sendable {
    let id: Int
    let userId: String?
    let name: String
    let volumeIds: [Int]
    let colorPaletteId: Int
    let glasswareId: Int
}

struct AlcoholVolume: Codable, Equatable, Sendable {
    let id: Int
    let name: String
    let volume: Float
}

struct AlcoholSubtype: Codable, Equatable, Sendable {
    let id: Int
    let alcoholTypeId: Int
    let userId: String?
    let name: String
    let colorPaletteId: Int?
    let glasswareId: Int?
}

struct ConsumptionType: Codable, Equatable, Sendable {
    let id: Int
    let name: String
    let glasswareId: Int
}

struct Brand: Codable, Equatable, Sendable {
    let id: Int
    let userId: String?
    let name: String
    let colorPaletteId: Int?
}

struct BeerFlavour: Codable, Equatable, Sendable {
    let id: Int
    let brandId: Int
    let userId: String?
    let name: String
    let colorPaletteId: Int?
}

struct NewAlcoholEntry: Codable, Equatable, Sendable {
    let name: String
    let volumes: [NewVolumeEntry]?
    let alcoholSubtypes: [String]?
    let colorPaletteId: Int?
    let glasswareId: Int?

    init(name: String, volumes: [NewVolumeEntry]? = nil, alcoholSubtypes: [String]? = nil, colorPaletteId: Int? = nil, glasswareId: Int? = nil) {
        self.name = name
        self.volumes = volumes
        self.alcoholSubtypes = alcoholSubtypes
        self.colorPaletteId = colorPaletteId
        self.glasswareId = glasswareId
    }
}

struct NewVolumeEntry: Codable, Equatable, Sendable {
    let name: String
    let volume: Float
}

struct NewAlcoholSubtype: Codable, Equatable, Sendable {
    let alcoholTypeId: Int
    let name: String
    let colorPaletteId: Int?
    let glasswareId: Int?

    init(alcoholTypeId: Int, name: String, colorPaletteId: Int? = nil, glasswareId: Int? = nil) {
        self.alcoholTypeId = alcoholTypeId
        self.name = name
        self.colorPaletteId = colorPaletteId
        self.glasswareId = glasswareId
    }
}

struct NewBeerBrand: Codable, Equatable, Sendable {
    let name: String
    let flavours: [String]?
    let colorPaletteId: Int?

    init(name: String, flavours: [String]? = nil, colorPaletteId: Int? = nil) {
        self.name = name
        self.flavours = flavours
        self.colorPaletteId = colorPaletteId
    }
}

struct NewBeerFlavour: Codable, Equatable, Sendable {
    let name: String
    let colorPaletteId: Int?

    init(name: String, colorPaletteId: Int? = nil) {
        self.name = name
        self.colorPaletteId = colorPaletteId
    }
}

struct EditableDrink: Codable, Equatable, Sendable {
    let id: Int
    let name: String
    let alcoholTypeId: Int
}
