import SwiftUI

/// One button look for the whole app, mirroring the web MUI overrides and the Add sheet CTA:
/// radius-sm, display type, accent fill, and a flat tinted fill with tertiary ink when disabled.
struct DrinkSaverButtonStyle: ButtonStyle {
    enum Kind { case primary, secondary, text }
    enum Size { case cta, regular }

    var kind: Kind = .primary
    var size: Size = .regular
    /// Fill the available width (CTAs); otherwise the button hugs its label.
    var fillsWidth = true
    /// Use paper ink when the button is drawn on the paper surface instead of the panel ink.
    var onPaper = false

    @Environment(ThemeStore.self) private var themeStore
    @Environment(\.isEnabled) private var isEnabled
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    func makeBody(configuration: Configuration) -> some View {
        let theme = themeStore.theme
        let filled = kind == .primary
        let pressed = configuration.isPressed && !reduceMotion
        configuration.label
            .underline(kind == .text)
            .font((size == .cta ? theme.type.displayM : theme.type.displayS).font)
            .foregroundStyle(Self.foreground(theme, kind: kind, onPaper: onPaper, enabled: isEnabled).color)
            .frame(maxWidth: fillsWidth ? .infinity : nil, minHeight: size == .cta ? 54 : 44)
            .padding(.horizontal, kind == .text ? theme.space.md : theme.space.lg)
            .background(fill(theme), in: RoundedRectangle(cornerRadius: theme.radius.sm))
            .overlay {
                if kind == .secondary {
                    RoundedRectangle(cornerRadius: theme.radius.sm)
                        .stroke(Self.secondaryBorder(theme: theme, onPaper: onPaper, enabled: isEnabled).color, lineWidth: 1)
                }
            }
            .shadow(color: filled && isEnabled && size == .cta ? .black.opacity(0.25) : .clear, radius: 6, y: 3)
            .opacity(configuration.isPressed && kind != .primary ? 0.7 : 1)
            .scaleEffect(pressed && filled ? 0.98 : 1)
            .contentShape(RoundedRectangle(cornerRadius: theme.radius.sm))
    }

    private func fill(_ theme: DrinkSaverTheme) -> Color {
        switch kind {
        case .primary: return isEnabled ? theme.accent.primary.color : theme.ink.primary.color.opacity(0.08)
        case .secondary: return Self.secondaryFill(theme: theme, onPaper: onPaper, enabled: isEnabled).color
        case .text: return .clear
        }
    }

    static func secondaryFill(theme: DrinkSaverTheme, onPaper: Bool, enabled: Bool = true) -> ThemeColor {
        let ink = onPaper ? theme.ink.onPaper : theme.ink.primary
        return ThemeColor(hex: ink.hex, opacity: onPaper ? (enabled ? 0.08 : 0.04) : 0)
    }

    static func secondaryBorder(theme: DrinkSaverTheme, onPaper: Bool, enabled: Bool = true) -> ThemeColor {
        let ink = onPaper ? theme.ink.onPaper : theme.ink.secondary
        return ThemeColor(hex: enabled ? ink.hex : theme.line.hairline.hex, opacity: onPaper ? 0.58 : 1)
    }

    static func foreground(_ theme: DrinkSaverTheme, kind: Kind, onPaper: Bool, enabled: Bool = true) -> ThemeColor {
        guard enabled else { return theme.ink.tertiary }
        switch kind {
        case .primary: return theme.ink.onAccent
        case .secondary: return onPaper ? theme.ink.onPaper : theme.ink.primary
        // Not accent.primary: 18pt semibold text is not "large", and the accent is about 3.3:1 on the panel.
        case .text: return onPaper ? theme.ink.onPaper : theme.ink.primary
        }
    }
}

extension ButtonStyle where Self == DrinkSaverButtonStyle {
    static func drinkSaver(_ kind: DrinkSaverButtonStyle.Kind = .primary, size: DrinkSaverButtonStyle.Size = .regular, fillsWidth: Bool = true, onPaper: Bool = false) -> DrinkSaverButtonStyle {
        DrinkSaverButtonStyle(kind: kind, size: size, fillsWidth: fillsWidth, onPaper: onPaper)
    }
}
