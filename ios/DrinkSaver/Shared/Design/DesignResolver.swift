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
}
