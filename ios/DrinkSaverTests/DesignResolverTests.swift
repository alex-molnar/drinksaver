import XCTest
@testable import DrinkSaver

final class DesignResolverTests: XCTestCase {
    private let catalogue = DesignCatalogue(palettes: DesignResolverTests.palettes, glassware: DesignResolverTests.glasswareFixtures)

    func testCatalogueContainsFrozenPaletteIDsAndResolvesNullOrUnknownToCream() {
        XCTAssertEqual(catalogue.palettes.map(\.id), Array(1...8))
        XCTAssertEqual(catalogue.palette(id: 7).name, "amber")
        XCTAssertEqual(catalogue.palette(id: nil).name, "cream")
        XCTAssertEqual(catalogue.palette(id: 999).name, "cream")
    }

    func testCatalogueContainsEveryFrozenGlassAndResolvesNullOrUnknownToHighball() {
        XCTAssertEqual(catalogue.glassware.map(\.id), Array(1...12))
        XCTAssertEqual(catalogue.glass(id: 11).name, "beerbottle")
        XCTAssertEqual(catalogue.glass(id: nil).name, "highball")
        XCTAssertEqual(catalogue.glass(id: 999).name, "highball")
    }

    func testEmptyCatalogueUsesFrozenFallbackDefinitions() {
        let empty = DesignCatalogue(palettes: [], glassware: [])
        XCTAssertEqual(empty.palette(id: nil), DesignCatalogue.fallbackPalette)
        XCTAssertEqual(empty.glass(id: nil), DesignCatalogue.fallbackGlass)
    }

    func testDrinkDesignResolvesPaletteAndGlassIndependently() {
        let selectedGlass = DesignResolver.resolve(paletteID: 3, glasswareID: 11, in: catalogue)
        let changedPalette = DesignResolver.resolve(paletteID: 7, glasswareID: 11, in: catalogue)
        let changedGlass = DesignResolver.resolve(paletteID: 3, glasswareID: 5, in: catalogue)

        XCTAssertNotEqual(selectedGlass.palette, changedPalette.palette)
        XCTAssertEqual(selectedGlass.glassware, changedPalette.glassware)
        XCTAssertEqual(selectedGlass.palette, changedGlass.palette)
        XCTAssertNotEqual(selectedGlass.glassware, changedGlass.glassware)
    }

    func testInheritedSubtypeBrandAndServingRulesMatchWeb() {
        XCTAssertEqual(DesignResolver.beerPaletteID(flavour: 6, brand: 2, alcoholType: 1), 6)
        XCTAssertEqual(DesignResolver.beerPaletteID(flavour: nil, brand: 2, alcoholType: 1), 2)
        XCTAssertEqual(DesignResolver.beerPaletteID(flavour: nil, brand: nil, alcoholType: 1), 1)
        XCTAssertEqual(DesignResolver.alcoholPaletteID(subtype: 5, alcoholType: 2), 5)
        XCTAssertEqual(DesignResolver.alcoholPaletteID(subtype: nil, alcoholType: 2), 2)
        XCTAssertEqual(DesignResolver.alcoholGlasswareID(subtype: nil, alcoholType: 4), 4)
        XCTAssertEqual(DesignResolver.beerGlasswareID(consumptionType: 8), 8)
        XCTAssertNil(DesignResolver.beerGlasswareID(consumptionType: nil))
    }

    private static let palettes: [Palette] = [
        .init(id: 1, name: "green", field: "#2B7454", inkLight: "#FFF6E3", inkDark: "#F4E9CE"),
        .init(id: 2, name: "brown", field: "#2B1A13", inkLight: "#FFF3DA", inkDark: "#EBD9B4"),
        .init(id: 3, name: "cream", field: "#DFD1B0", inkLight: "#3B241B", inkDark: "#2B1A14"),
        .init(id: 4, name: "red", field: "#BA422C", inkLight: "#FFF4DB", inkDark: "#F9EDD4"),
        .init(id: 5, name: "blue", field: "#2C4B6E", inkLight: "#FFF2D8", inkDark: "#EFE2C8"),
        .init(id: 6, name: "plum", field: "#6B3350", inkLight: "#FFF0DD", inkDark: "#F2E4CE"),
        .init(id: 7, name: "amber", field: "#C9973B", inkLight: "#342016", inkDark: "#2B1A14"),
        .init(id: 8, name: "rose", field: "#D4A0A7", inkLight: "#3B211C", inkDark: "#2B1A14"),
    ]

    static let glasswareFixtures: [Glassware] = [
        .init(id: 1, name: "pint", g: "M8 5h18l-2.2 40a3 3 0 0 1-3 2.6h-7.6a3 3 0 0 1-3-2.6Z", l: "M9.5 15h15l-1.85 29.4a1.5 1.5 0 0 1-1.5 1.3h-8.3a1.5 1.5 0 0 1-1.5-1.3Z", f: "M8.7 8.4h16.6l-.42 6.6H9.12Z"),
        .init(id: 2, name: "tulip", g: "M8.5 5h17c0 14-3 20.5-8.5 22.5C11.5 25.5 8.5 19 8.5 5Z M16.1 27.4h1.8v13.9h-1.8Z M10.4 44h13.2v3h-13.2Z", l: "M10.3 12.4h13.4c-.9 9.2-3.3 13.3-6.7 14.9-3.4-1.6-5.8-5.7-6.7-14.9Z", f: "M9.1 7.6h15.8l.5 4.8H8.6Z"),
        .init(id: 3, name: "wine", g: "M8 5c0 12 2 17.2 9 19.6 7-2.4 9-7.6 9-19.6Z M16.1 24.6h1.8v16.6h-1.8Z M9.8 43.9h14.4v3h-14.4Z", l: "M9.7 12.6c.75 6.5 2.7 9.9 7.3 11.7 4.6-1.8 6.55-5.2 7.3-11.7Z", f: nil),
        .init(id: 4, name: "highball", g: "M10 4h14v39a3 3 0 0 1-3 3h-8a3 3 0 0 1-3-3Z", l: "M11.4 13.6h11.2v28.9a1.5 1.5 0 0 1-1.5 1.4h-8.2a1.5 1.5 0 0 1-1.5-1.4Z", f: nil),
        .init(id: 5, name: "rocks", g: "M6 22h22l-1.4 21.5a3 3 0 0 1-3 2.5H10.4a3 3 0 0 1-3-2.5Z", l: "M8 29h18l-.95 14.2a1.4 1.4 0 0 1-1.4 1.2h-13.3a1.4 1.4 0 0 1-1.4-1.2Z", f: nil),
        .init(id: 6, name: "shot", g: "M10 29h14l-1.6 17H11.6Z", l: "M11.9 33h10.2l-1.05 11.4h-8.1Z", f: nil),
        .init(id: 7, name: "coupe", g: "M4 13h26c-1 8-6 12-13 12S5 21 4 13Z M16.1 25h1.8v17h-1.8Z M9.8 44h14.4v3H9.8Z", l: "M6.5 17h21c-2 4.5-5.5 7-10.5 7S8.5 21.5 6.5 17Z", f: nil),
        .init(id: 8, name: "flute", g: "M11 4h12v19c0 6-2 9-6 11-4-2-6-5-6-11Z M16.1 34h1.8v8.3h-1.8Z M10.4 44h13.2v3H10.4Z", l: "M12.6 12h8.8v11c0 5-1.4 7.8-4.4 9.4-3-1.6-4.4-4.4-4.4-9.4Z", f: nil),
        .init(id: 9, name: "palinka", g: "M11 4h12C22 9 21.5 13 24 17.5c3 5.3-1 7.8-7 10-6-2.2-10-4.7-7-10C12.5 13 12 9 11 4Z M16.1 27.5h1.8v15.9h-1.8Z M9 46c0-1.2 3.6-2 8-2s8 .8 8 2-3.6 1.5-8 1.5S9 47.2 9 46Z", l: "M10.5 19h13c1.6 3.3-1.5 5.2-6.5 7.1-5-1.9-8.1-3.8-6.5-7.1Z", f: nil),
        .init(id: 10, name: "beercan", g: "M10 5h14l2 3v34l-2 3H10l-2-3V8Z M8.8 10h16.4 M8.8 40h16.4 M11 16h12 M11 34h12 M13 6.8h8 M15 8.4h4", l: "M9.8 12h14.4v26H9.8Z", f: nil),
        .init(id: 11, name: "beerbottle", g: "M14.5 7h5A4 2 0 0 1 19 8L20 15c1 2 2 3 3 6c0.5 3 0.5 4 0.5 10v12a3 3 0 0 1-3 3H12a3 3 0 0 1-1.5-3V31c0-4 0-7 0.5-10c1-3 2-4 3-6L15 8A4 2 0 0 1 14.5 7L14 7C14.2 6.2 14.2 6.2 15 6H19C19.8 6.2 20 7 20 7ZM12 29h10M12 39h10", l: "M11 26h12v17a2 2 0 0 1-2 2h-8a2 2 0 0 1-2-2Z", f: nil),
        .init(id: 12, name: "beerjug", g: "M5 14h20v30a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3ZM25 19h3a3 3 0 0 1 3 3v13a3 3 0 0 1-3 3h-3M25 23h2v11h-2M10 21v22M15 21v22M20 21v22", l: "M7 18h16v25a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2Z", f: nil),
    ]
}
