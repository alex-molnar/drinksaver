import Foundation

struct Palette: Codable, Equatable, Identifiable, Sendable {
    let id: Int
    let name: String
    let field: String
    let inkLight: String?
    let inkDark: String
}

struct Glassware: Codable, Equatable, Identifiable, Sendable {
    let id: Int
    let name: String
    let g: String
    let l: String
    let f: String?
}

struct ResolvedDrinkDesign: Equatable, Sendable {
    let palette: Palette
    let glassware: Glassware
}

struct DesignCatalogue: Equatable, Sendable {
    let palettes: [Palette]
    let glassware: [Glassware]

    func palette(id: Int?) -> Palette {
        palettes.first { $0.id == id }
            ?? palettes.first { $0.name.lowercased() == Self.fallbackPalette.name }
            ?? Self.fallbackPalette
    }

    func glass(id: Int?) -> Glassware {
        glassware.first { $0.id == id }
            ?? glassware.first { $0.name.lowercased() == Self.fallbackGlass.name }
            ?? Self.fallbackGlass
    }

    static let fallbackPalette = Palette(
        id: 0, name: "cream", field: "#DFD1B0", inkLight: nil, inkDark: "#2B1A14"
    )
    static let fallbackGlass = Glassware(
        id: 0,
        name: "highball",
        g: "M10 4h14v39a3 3 0 0 1-3 3h-8a3 3 0 0 1-3-3Z",
        l: "M11.4 13.6h11.2v28.9a1.5 1.5 0 0 1-1.5 1.4h-8.2a1.5 1.5 0 0 1-1.5-1.4Z",
        f: nil
    )
}
