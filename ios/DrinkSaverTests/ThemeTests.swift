import XCTest
@testable import DrinkSaver

final class ThemeTests: XCTestCase {
    func testDarkThemeMatchesFrozenWebTokens() {
        let theme = DrinkSaverTheme.dark
        XCTAssertEqual(theme.mode, .dark)
        XCTAssertEqual(theme.surface, SurfaceTokens(
            ground: .init(hex: 0x231512), raised: .init(hex: 0x2A1A15), panel: .init(hex: 0x2E1C17),
            recess: .init(hex: 0x1B0F0D), paper: .init(hex: 0xEBDCC0)
        ))
        XCTAssertEqual(theme.ink, InkTokens(
            primary: .init(hex: 0xF2E4CE), secondary: .init(hex: 0xF2E4CE, opacity: 0.70),
            tertiary: .init(hex: 0xF2E4CE, opacity: 0.52), onPaper: .init(hex: 0x2B1A14),
            onAccent: .init(hex: 0xFFFFFF)
        ))
        XCTAssertEqual(theme.line, LineTokens(hairline: .init(hex: 0xF2E4CE, opacity: 0.14)))
        XCTAssertEqual(theme.accent, AccentTokens(
            primary: .init(hex: 0xC4462E), danger: .init(hex: 0xC4462E), active: .init(hex: 0xC8952B)
        ))
        XCTAssertEqual(theme.texture, TextureTokens(noiseOpacity: 0.06))
        XCTAssertEqual(theme.elevation, ElevationTokens(
            flat: [],
            raised: [
                shadow(0x000000, 0.4, y: 1, blur: 2), shadow(0x000000, 0.35, y: 4, blur: 12),
            ],
            sunken: [shadow(0x000000, 0.5, y: 2, blur: 4, inset: true)],
            overlay: [shadow(0x000000, 0.5, y: 8, blur: 24), shadow(0x000000, 0.4, y: 2, blur: 8)]
        ))
        XCTAssertEqual(theme.radius, RadiusTokens(none: 0, sm: 4, md: 8, lg: 16, full: 999))
        XCTAssertEqual(theme.space, SpaceTokens(xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48))
        XCTAssertEqual(theme.type, expectedType)
        XCTAssertEqual(theme.motion, expectedMotion)
    }

    func testLightThemeMatchesFrozenWebTokensAndInheritsSharedTokens() {
        let theme = DrinkSaverTheme.light
        XCTAssertEqual(theme.mode, .light)
        XCTAssertEqual(theme.surface, SurfaceTokens(
            ground: .init(hex: 0xF3E8D4), raised: .init(hex: 0xE9D8BA), panel: .init(hex: 0xFBF2E2),
            recess: .init(hex: 0xD8C1A0), paper: .init(hex: 0xE5CFA7)
        ))
        XCTAssertEqual(theme.ink, InkTokens(
            primary: .init(hex: 0x35231B), secondary: .init(hex: 0x5C473D), tertiary: .init(hex: 0x70574A),
            onPaper: .init(hex: 0x3A281E), onAccent: .init(hex: 0xFFF7E7)
        ))
        XCTAssertEqual(theme.line, LineTokens(hairline: .init(hex: 0x35231B, opacity: 0.18)))
        XCTAssertEqual(theme.accent, AccentTokens(
            primary: .init(hex: 0xB74632), danger: .init(hex: 0xB74632), active: .init(hex: 0x966018)
        ))
        XCTAssertEqual(theme.texture, .init(noiseOpacity: 0.06))
        XCTAssertEqual(theme.elevation, ElevationTokens(
            flat: [],
            raised: [
                shadow(0x4B301F, 0.16, y: 1, blur: 2), shadow(0x4B301F, 0.13, y: 5, blur: 14),
            ],
            sunken: [shadow(0x4B301F, 0.20, y: 2, blur: 4, inset: true)],
            overlay: [shadow(0x4B301F, 0.22, y: 10, blur: 28), shadow(0x4B301F, 0.14, y: 2, blur: 8)]
        ))
        XCTAssertEqual(theme.radius, DrinkSaverTheme.dark.radius)
        XCTAssertEqual(theme.space, DrinkSaverTheme.dark.space)
        XCTAssertEqual(theme.type, expectedType)
        XCTAssertEqual(theme.motion, expectedMotion)
    }

    func testThemeTextAndControlContrastMeetsWCAGThresholds() {
        for theme in [DrinkSaverTheme.dark, .light] {
            for foreground in [theme.ink.primary, theme.ink.secondary, theme.ink.tertiary] {
                XCTAssertGreaterThanOrEqual(contrast(foreground, theme.surface.ground), 4.5)
            }
            XCTAssertGreaterThanOrEqual(contrast(theme.ink.onPaper, theme.surface.paper), 4.5)
            XCTAssertGreaterThanOrEqual(contrast(theme.surface.panel, theme.accent.active), 3)
        }

        let light = DrinkSaverTheme.light
        let dark = DrinkSaverTheme.dark
        XCTAssertGreaterThanOrEqual(contrast(dark.ink.onAccent, dark.accent.primary), 4.5)
        XCTAssertGreaterThanOrEqual(contrast(light.ink.onAccent, light.accent.primary), 4.5)
        XCTAssertGreaterThanOrEqual(contrast(light.ink.onAccent, light.accent.active), 4.5)
    }

    @MainActor
    func testMissingOrInvalidStoredModeDefaultsToDark() throws {
        let defaults = try isolatedDefaults()
        XCTAssertEqual(ThemeStore(defaults: defaults).mode, .dark)

        defaults.set("sepia", forKey: ThemeStore.storageKey)
        XCTAssertEqual(ThemeStore(defaults: defaults).mode, .dark)
    }

    @MainActor
    func testTogglePersistsSelectionAndTheme() throws {
        let defaults = try isolatedDefaults()
        let store = ThemeStore(defaults: defaults)

        store.toggle()
        XCTAssertEqual(store.mode, .light)
        XCTAssertEqual(store.theme, .light)
        XCTAssertEqual(defaults.string(forKey: ThemeStore.storageKey), "light")
        XCTAssertEqual(ThemeStore(defaults: defaults).mode, .light)

        store.toggle()
        XCTAssertEqual(store.mode, .dark)
        XCTAssertEqual(defaults.string(forKey: ThemeStore.storageKey), "dark")
    }

    private var expectedType: TypeTokens {
        TypeTokens(
            displayL: .init(postScriptName: "FrauncesDisplayL", size: 27, weight: 700, textStyle: .largeTitle, monospacedDigits: false),
            displayM: .init(postScriptName: "FrauncesDisplayM", size: 20, weight: 700, textStyle: .title, monospacedDigits: false),
            displayS: .init(postScriptName: "FrauncesDisplayS", size: 18, weight: 600, textStyle: .title2, monospacedDigits: false),
            numeral: .init(postScriptName: "FrauncesNumeral", size: 48, weight: 700, textStyle: .largeTitle, monospacedDigits: true),
            body: .init(postScriptName: "FamiljenGroteskVariable", size: 15, weight: 400, textStyle: .body, monospacedDigits: false),
            caption: .init(postScriptName: "FamiljenGroteskVariable", size: 11.5, weight: 500, textStyle: .caption, monospacedDigits: false)
        )
    }

    private var expectedMotion: MotionTokens {
        MotionTokens(
            fast: 0.12, base: 0.2, slow: 0.32,
            standard: .init(x1: 0.4, y1: 0, x2: 0.2, y2: 1),
            decelerate: .init(x1: 0, y1: 0, x2: 0.2, y2: 1),
            accelerate: .init(x1: 0.4, y1: 0, x2: 1, y2: 1)
        )
    }

    private func shadow(_ hex: UInt32, _ opacity: Double, y: Double, blur: Double, inset: Bool = false) -> ShadowLayer {
        ShadowLayer(color: .init(hex: hex, opacity: opacity), x: 0, y: y, blur: blur, spread: 0, inset: inset)
    }

    private func isolatedDefaults() throws -> UserDefaults {
        let suiteName = "ThemeTests-\(UUID().uuidString)"
        let defaults = try XCTUnwrap(UserDefaults(suiteName: suiteName))
        defaults.removePersistentDomain(forName: suiteName)
        return defaults
    }

    private func contrast(_ foreground: ThemeColor, _ background: ThemeColor) -> Double {
        let front = composite(rgb(foreground.hex), over: rgb(background.hex), alpha: foreground.opacity)
        let back = rgb(background.hex)
        let first = luminance(front)
        let second = luminance(back)
        return (max(first, second) + 0.05) / (min(first, second) + 0.05)
    }

    private func rgb(_ hex: UInt32) -> [Double] {
        [Double((hex >> 16) & 0xFF), Double((hex >> 8) & 0xFF), Double(hex & 0xFF)]
    }

    private func composite(_ foreground: [Double], over background: [Double], alpha: Double) -> [Double] {
        zip(foreground, background).map { front, back in alpha * front + (1 - alpha) * back }
    }

    private func luminance(_ rgb: [Double]) -> Double {
        let channels = rgb.map { value -> Double in
            let normalized = value / 255
            return normalized <= 0.04045 ? normalized / 12.92 : pow((normalized + 0.055) / 1.055, 2.4)
        }
        return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]
    }
}
