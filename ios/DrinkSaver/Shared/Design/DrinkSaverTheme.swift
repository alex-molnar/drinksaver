import SwiftUI

enum ThemeMode: String, Codable, CaseIterable {
    case dark
    case light
}

struct SurfaceTokens: Equatable {
    let ground: ThemeColor
    let raised: ThemeColor
    let panel: ThemeColor
    let recess: ThemeColor
    let paper: ThemeColor
}

struct InkTokens: Equatable {
    let primary: ThemeColor
    let secondary: ThemeColor
    let tertiary: ThemeColor
    let onPaper: ThemeColor
    let onAccent: ThemeColor
}

struct LineTokens: Equatable {
    let hairline: ThemeColor
}

struct AccentTokens: Equatable {
    let primary: ThemeColor
    let danger: ThemeColor
    let active: ThemeColor
}

struct TextureTokens: Equatable {
    let noiseOpacity: Double
}

struct ShadowLayer: Equatable {
    let color: ThemeColor
    let x: Double
    let y: Double
    let blur: Double
    let spread: Double
    let inset: Bool
}

struct ElevationTokens: Equatable {
    let flat: [ShadowLayer]
    let raised: [ShadowLayer]
    let sunken: [ShadowLayer]
    let overlay: [ShadowLayer]
}

struct RadiusTokens: Equatable {
    let none: Double
    let sm: Double
    let md: Double
    let lg: Double
    let full: Double
}

struct SpaceTokens: Equatable {
    let xs: Double
    let sm: Double
    let md: Double
    let lg: Double
    let xl: Double
    let xxl: Double
    let xxxl: Double
}

enum ThemeTextStyle: String, Equatable {
    case largeTitle
    case title
    case title2
    case body
    case caption

    var swiftUITextStyle: Font.TextStyle {
        switch self {
        case .largeTitle: .largeTitle
        case .title: .title
        case .title2: .title2
        case .body: .body
        case .caption: .caption
        }
    }
}

struct TypeRole: Equatable {
    let postScriptName: String
    let size: Double
    let weight: Int
    let textStyle: ThemeTextStyle
    let monospacedDigits: Bool

    var font: Font {
        let font = Font.custom(postScriptName, size: size, relativeTo: textStyle.swiftUITextStyle)
        if postScriptName == "FamiljenGroteskVariable", weight == 500 {
            return font.weight(.medium)
        }
        return monospacedDigits ? font.monospacedDigit() : font
    }
}

struct TypeTokens: Equatable {
    let displayL: TypeRole
    let displayM: TypeRole
    let displayS: TypeRole
    let numeral: TypeRole
    let body: TypeRole
    let caption: TypeRole
}

struct CubicBezier: Equatable {
    let x1: Double
    let y1: Double
    let x2: Double
    let y2: Double
}

struct MotionTokens: Equatable {
    let fast: Double
    let base: Double
    let slow: Double
    let standard: CubicBezier
    let decelerate: CubicBezier
    let accelerate: CubicBezier
}

struct DrinkSaverTheme: Equatable {
    let mode: ThemeMode
    let surface: SurfaceTokens
    let ink: InkTokens
    let line: LineTokens
    let accent: AccentTokens
    let texture: TextureTokens
    let elevation: ElevationTokens
    let radius: RadiusTokens
    let space: SpaceTokens
    let type: TypeTokens
    let motion: MotionTokens

    static let dark = DrinkSaverTheme(
        mode: .dark,
        surface: SurfaceTokens(
            ground: .init(hex: 0x231512), raised: .init(hex: 0x2A1A15), panel: .init(hex: 0x2E1C17),
            recess: .init(hex: 0x1B0F0D), paper: .init(hex: 0xEBDCC0)
        ),
        ink: InkTokens(
            primary: .init(hex: 0xF2E4CE), secondary: .init(hex: 0xF2E4CE, opacity: 0.70),
            tertiary: .init(hex: 0xF2E4CE, opacity: 0.52), onPaper: .init(hex: 0x2B1A14),
            onAccent: .init(hex: 0xF2E4CE)
        ),
        line: LineTokens(hairline: .init(hex: 0xF2E4CE, opacity: 0.14)),
        accent: AccentTokens(
            primary: .init(hex: 0xC4462E), danger: .init(hex: 0xC4462E), active: .init(hex: 0xC8952B)
        ),
        texture: TextureTokens(noiseOpacity: 0.06),
        elevation: ElevationTokens(
            flat: [],
            raised: [
                .init(color: .init(hex: 0x000000, opacity: 0.4), x: 0, y: 1, blur: 2, spread: 0, inset: false),
                .init(color: .init(hex: 0x000000, opacity: 0.35), x: 0, y: 4, blur: 12, spread: 0, inset: false),
            ],
            sunken: [.init(color: .init(hex: 0x000000, opacity: 0.5), x: 0, y: 2, blur: 4, spread: 0, inset: true)],
            overlay: [
                .init(color: .init(hex: 0x000000, opacity: 0.5), x: 0, y: 8, blur: 24, spread: 0, inset: false),
                .init(color: .init(hex: 0x000000, opacity: 0.4), x: 0, y: 2, blur: 8, spread: 0, inset: false),
            ]
        ),
        radius: RadiusTokens(none: 0, sm: 4, md: 8, lg: 16, full: 999),
        space: SpaceTokens(xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48),
        type: TypeTokens(
            displayL: .init(postScriptName: "FrauncesDisplayL", size: 27, weight: 700, textStyle: .largeTitle, monospacedDigits: false),
            displayM: .init(postScriptName: "FrauncesDisplayM", size: 20, weight: 700, textStyle: .title, monospacedDigits: false),
            displayS: .init(postScriptName: "FrauncesDisplayS", size: 18, weight: 600, textStyle: .title2, monospacedDigits: false),
            numeral: .init(postScriptName: "FrauncesNumeral", size: 48, weight: 700, textStyle: .largeTitle, monospacedDigits: true),
            body: .init(postScriptName: "FamiljenGroteskVariable", size: 15, weight: 400, textStyle: .body, monospacedDigits: false),
            caption: .init(postScriptName: "FamiljenGroteskVariable", size: 11.5, weight: 500, textStyle: .caption, monospacedDigits: false)
        ),
        motion: MotionTokens(
            fast: 0.12, base: 0.2, slow: 0.32,
            standard: .init(x1: 0.4, y1: 0, x2: 0.2, y2: 1),
            decelerate: .init(x1: 0, y1: 0, x2: 0.2, y2: 1),
            accelerate: .init(x1: 0.4, y1: 0, x2: 1, y2: 1)
        )
    )

    static let light = DrinkSaverTheme(
        mode: .light,
        surface: SurfaceTokens(
            ground: .init(hex: 0xF3E8D4), raised: .init(hex: 0xE9D8BA), panel: .init(hex: 0xFBF2E2),
            recess: .init(hex: 0xD8C1A0), paper: .init(hex: 0xE5CFA7)
        ),
        ink: InkTokens(
            primary: .init(hex: 0x35231B), secondary: .init(hex: 0x5C473D), tertiary: .init(hex: 0x70574A),
            onPaper: .init(hex: 0x3A281E), onAccent: .init(hex: 0xFFF7E7)
        ),
        line: LineTokens(hairline: .init(hex: 0x35231B, opacity: 0.18)),
        accent: AccentTokens(
            primary: .init(hex: 0xB74632), danger: .init(hex: 0xB74632), active: .init(hex: 0x966018)
        ),
        texture: dark.texture,
        elevation: ElevationTokens(
            flat: [],
            raised: [
                .init(color: .init(hex: 0x4B301F, opacity: 0.16), x: 0, y: 1, blur: 2, spread: 0, inset: false),
                .init(color: .init(hex: 0x4B301F, opacity: 0.13), x: 0, y: 5, blur: 14, spread: 0, inset: false),
            ],
            sunken: [.init(color: .init(hex: 0x4B301F, opacity: 0.20), x: 0, y: 2, blur: 4, spread: 0, inset: true)],
            overlay: [
                .init(color: .init(hex: 0x4B301F, opacity: 0.22), x: 0, y: 10, blur: 28, spread: 0, inset: false),
                .init(color: .init(hex: 0x4B301F, opacity: 0.14), x: 0, y: 2, blur: 8, spread: 0, inset: false),
            ]
        ),
        radius: dark.radius,
        space: dark.space,
        type: dark.type,
        motion: dark.motion
    )
}
