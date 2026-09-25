import SwiftUI

struct PlateView: View {
    enum Status { case idle, saving, done }

    @Environment(ThemeStore.self) private var themeStore
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    let name: String
    let design: ResolvedDrinkDesign
    let rotation: Double
    let status: Status
    let disabled: Bool
    let accessibilityIdentifier: String
    let action: () -> Void

    private var palette: Palette { design.palette }
    private var theme: DrinkSaverTheme { themeStore.theme }
    private var field: Color { Color(hexString: palette.field, fallback: DesignCatalogue.fallbackPalette.field) }
    private var ink: Color {
        let color = theme.mode == .light ? palette.inkLight ?? palette.inkDark : palette.inkDark
        return Color(hexString: color, fallback: "#2B1A14")
    }

    var body: some View {
        Button(action: action) {
            ZStack {
                enamel
                VStack(alignment: .leading, spacing: 0) {
                    glass
                    Text(name)
                        .font(theme.type.displayM.font)
                        .lineLimit(2)
                        .minimumScaleFactor(0.82)
                        .foregroundStyle(ink)
                        .padding(.top, 9)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
                .padding(.horizontal, 13)
                .padding(.vertical, 14)

                if status == .done {
                    Text("Saved")
                        .font(theme.type.displayM.font.weight(.heavy))
                        .tracking(0.6)
                        .foregroundStyle(theme.accent.primary.color)
                        .padding(.horizontal, 13)
                        .padding(.vertical, 5)
                        .background(theme.surface.paper.color.opacity(0.94), in: RoundedRectangle(cornerRadius: 4))
                        .overlay(RoundedRectangle(cornerRadius: 4).stroke(theme.accent.primary.color, lineWidth: 2.5))
                        .rotationEffect(.degrees(-9))
                        .accessibilityHidden(true)
                }
            }
            .frame(maxWidth: .infinity, minHeight: 150, maxHeight: .infinity)
            .background(field, in: RoundedRectangle(cornerRadius: theme.radius.md))
            .overlay {
                RoundedRectangle(cornerRadius: theme.radius.sm)
                    .stroke(ink.opacity(0.5), lineWidth: 1.4)
                    .padding(6)
                    .allowsHitTesting(false)
            }
            .overlay(alignment: .topLeading) { screw.padding(9) }
            .overlay(alignment: .topTrailing) { screw.padding(9) }
            .overlay(alignment: .bottomLeading) { screw.opacity(0.58).padding(9) }
            .shadow(color: .black.opacity(theme.mode == .dark ? 0.35 : 0.13), radius: 8, x: 0, y: 4)
            .rotationEffect(.degrees(rotation))
            .opacity(status == .saving ? 0.72 : 1)
            .animation(reduceMotion ? nil : .spring(response: 0.36, dampingFraction: 0.86), value: status == .done)
        }
        .buttonStyle(PlatePressStyle(reduceMotion: reduceMotion))
        .disabled(disabled || status == .saving)
        .accessibilityLabel(name)
        .accessibilityValue(status == .saving ? "Saving" : status == .done ? "Saved" : "Tap to save")
        .accessibilityIdentifier(accessibilityIdentifier)
    }

    private var enamel: some View {
        RoundedRectangle(cornerRadius: theme.radius.md)
            .fill(
                LinearGradient(
                    colors: [Color.white.opacity(0.13), Color.white.opacity(0.02), .clear],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
            )
    }

    private var glass: some View {
        ZStack {
            GlassShape(pathData: design.glassware.g)
                .stroke(ink.opacity(0.92), style: StrokeStyle(lineWidth: 1.6, lineCap: .round, lineJoin: .round))
            GlassShape(pathData: design.glassware.l)
                .fill(ink.opacity(0.22))
            if let foam = design.glassware.f {
                GlassShape(pathData: foam)
                    .fill(ink.opacity(0.28))
            }
        }
        .frame(width: 42, height: 58)
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.top, 3)
        .accessibilityHidden(true)
    }

    private var screw: some View {
        Circle()
            .fill(ink.opacity(0.24))
            .frame(width: 5, height: 5)
    }

    static func add(rotation: Double, disabled: Bool, action: @escaping () -> Void) -> some View {
        AddPlateView(rotation: rotation, disabled: disabled, action: action)
    }
}

private struct AddPlateView: View {
    @Environment(ThemeStore.self) private var themeStore
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    let rotation: Double
    let disabled: Bool
    let action: () -> Void

    private var theme: DrinkSaverTheme { themeStore.theme }

    var body: some View {
        Button(action: action) {
            VStack(spacing: 5) {
                Text("+")
                    .font(theme.type.displayL.font)
                    .foregroundStyle(theme.ink.tertiary.color)
                Text("Something else")
                    .font(theme.type.displayM.font)
                    .multilineTextAlignment(.center)
                    .foregroundStyle(theme.ink.secondary.color)
            }
            .padding(12)
            .frame(maxWidth: .infinity, minHeight: 150, maxHeight: .infinity)
            .overlay {
                RoundedRectangle(cornerRadius: theme.radius.md)
                    .strokeBorder(theme.ink.primary.color.opacity(0.3), style: StrokeStyle(lineWidth: 1.6, dash: [6, 4]))
            }
            .rotationEffect(.degrees(rotation))
            .opacity(disabled ? 0.5 : 1)
        }
        .buttonStyle(PlatePressStyle(reduceMotion: reduceMotion))
        .disabled(disabled)
        .accessibilityLabel("Something else")
    }
}

private struct PlatePressStyle: ButtonStyle {
    let reduceMotion: Bool

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed && !reduceMotion ? 0.965 : 1)
            .animation(reduceMotion ? nil : .easeOut(duration: 0.12), value: configuration.isPressed)
    }
}

private extension Color {
    init(hexString: String?, fallback: String) {
        let value = hexString ?? fallback
        let normalized = value.hasPrefix("#") ? String(value.dropFirst()) : value
        let hex = UInt32(normalized, radix: 16) ?? 0x2B1A14
        self.init(.sRGB, red: Double((hex >> 16) & 0xFF) / 255, green: Double((hex >> 8) & 0xFF) / 255,
                  blue: Double(hex & 0xFF) / 255, opacity: 1)
    }
}
