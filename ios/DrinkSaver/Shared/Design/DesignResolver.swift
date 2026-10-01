import Foundation

enum DesignResolver {
    static func resolve(paletteID: Int?, glasswareID: Int?, in catalogue: DesignCatalogue) -> ResolvedDrinkDesign {
        ResolvedDrinkDesign(
            palette: catalogue.palette(id: paletteID),
            glassware: catalogue.glass(id: glasswareID)
        )
    }

    static func beerPaletteID(flavour: Int?, brand: Int?, alcoholType: Int?) -> Int? {
        flavour ?? brand ?? alcoholType
    }

    static func alcoholPaletteID(subtype: Int?, alcoholType: Int?) -> Int? {
        subtype ?? alcoholType
    }

    static func alcoholGlasswareID(subtype: Int?, alcoholType: Int?) -> Int? {
        subtype ?? alcoholType
    }

    static func beerGlasswareID(consumptionType: Int?) -> Int? {
        consumptionType
    }

    /// History rows carry only a name and alcohol type, so the glass is picked the way web's
    /// `drinkIdentity` does: by known drink name, then by alcohol type, then the catalogue fallback.
    static func historyGlassware(name: String, alcoholTypeId: Int?, in catalogue: DesignCatalogue) -> Glassware {
        let glassName = historyGlassByName[name] ?? alcoholTypeId.flatMap { historyGlassByAlcoholType[$0] }
        return catalogue.glass(named: glassName)
    }

    private static let historyGlassByName: [String: String] = [
        "Heineken pint": "palinka", "Guinness pint": "pint", "Duvel bottle": "tulip",
        "Chouffe bottle": "tulip", "Gin and tonic": "highball", "Glass of red": "wine",
    ]

    private static let historyGlassByAlcoholType: [Int: String] = {
        var map: [Int: String] = [:]
        for id in [4, 21, 24] { map[id] = "pint" }
        for id in [13, 14, 19, 20, 22, 26, 27, 30, 31, 32] { map[id] = "wine" }
        for id in [6, 7, 8, 9, 10, 11, 12, 15, 16, 17, 18, 23, 25, 28, 29] { map[id] = "highball" }
        return map
    }()
}
