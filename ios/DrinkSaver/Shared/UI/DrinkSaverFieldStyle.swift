import SwiftUI

/// Text input look shared with the web Add sheet `TextInput`: recess surface, 1.4pt ink border,
/// radius-sm, body type, accent border while focused. (The web MUI `TextField` is a different control,
/// radius-md and 52 pt; this app's inputs follow the Add sheet one, with a 52 pt minimum height.)
struct DrinkSaverFieldModifier: ViewModifier {
    /// The field's single focus binding. Pass the owner's `FocusState` to drive focus from outside,
    /// otherwise the modifier keeps its own. Never both: two bindings on one field fight each other.
    var external: FocusState<Bool>.Binding?
    /// Field sits on the paper surface (light even in dark mode): use the on-paper ink and a fill tuned to it.
    var onPaper = false
    @Environment(ThemeStore.self) private var themeStore
    @Environment(\.isEnabled) private var isEnabled
    @FocusState private var ownFocus: Bool

    func body(content: Content) -> some View {
        let theme = themeStore.theme
        let binding = external ?? $ownFocus
        let ink = onPaper ? theme.ink.onPaper : theme.ink.primary
        content
            .font(theme.type.body.font)
            .foregroundStyle(isEnabled ? ink.color : DrinkSaverFieldTone.disabledInk(theme: theme, onPaper: onPaper).color)
            .tint(theme.accent.primary.color)
            .focused(binding)
            .padding(.horizontal, theme.space.md)
            .frame(minHeight: 52)
            .background(DrinkSaverFieldTone.fill(theme: theme, onPaper: onPaper).color, in: RoundedRectangle(cornerRadius: theme.radius.sm))
            .overlay {
                RoundedRectangle(cornerRadius: theme.radius.sm)
                    .stroke(binding.wrappedValue ? theme.accent.primary.color : ink.color.opacity(0.52), lineWidth: 1.4)
            }
    }
}

/// Field colours. On the paper surface (light even in dark mode) the fill, placeholder and disabled
/// ink are derived from the on-paper ink, since the ground-relative tokens (cream in dark mode) would
/// be near invisible on it.
enum DrinkSaverFieldTone {
    /// Light keeps the recess tone. On paper in dark mode, where recess is near black against the light
    /// paper, a faint tint of the paper ink (about 9%) sits close to its surroundings.
    static func fill(theme: DrinkSaverTheme, onPaper: Bool) -> ThemeColor {
        guard onPaper, theme.mode == .dark else { return theme.surface.recess }
        func mix(_ shift: UInt32) -> UInt32 {
            let p = Double((theme.surface.paper.hex >> shift) & 0xFF), i = Double((theme.ink.onPaper.hex >> shift) & 0xFF)
            return UInt32((p * 0.91 + i * 0.09).rounded())
        }
        return ThemeColor(hex: mix(16) << 16 | mix(8) << 8 | mix(0))
    }

    /// Placeholder text colour for a field on the paper.
    static func paperPlaceholder(theme: DrinkSaverTheme) -> ThemeColor { ThemeColor(hex: theme.ink.onPaper.hex, opacity: 0.8) }

    static func disabledInk(theme: DrinkSaverTheme, onPaper: Bool) -> ThemeColor {
        onPaper ? paperPlaceholder(theme: theme) : theme.ink.tertiary
    }
}

extension View {
    func drinkSaverField(focus: FocusState<Bool>.Binding? = nil, onPaper: Bool = false) -> some View { modifier(DrinkSaverFieldModifier(external: focus, onPaper: onPaper)) }
}

/// Square -/+ stepper control like the web quantity stepper: ink glyph, 52 pt box, 1.4 pt border, 5% ink
/// fill, dimmed to 28% when disabled (apply `.disabled(...)` at the call site).
struct DrinkSaverStepperButton: View {
    let systemImage: String
    let label: String
    let action: () -> Void
    @Environment(ThemeStore.self) private var themeStore
    @Environment(\.isEnabled) private var isEnabled

    var body: some View {
        let theme = themeStore.theme
        Button(action: action) {
            Image(systemName: systemImage).font(theme.type.displayS.font)
                .foregroundStyle(theme.ink.primary.color)
                .frame(width: 52, height: 52)
                .background(theme.ink.primary.color.opacity(0.05), in: RoundedRectangle(cornerRadius: theme.radius.sm))
                .overlay { RoundedRectangle(cornerRadius: theme.radius.sm).stroke(theme.ink.primary.color.opacity(0.52), lineWidth: 1.4) }
                .opacity(isEnabled ? 1 : 0.28)
                .contentShape(Rectangle())
        }
        .buttonStyle(.plain).accessibilityLabel(label)
    }
}

/// Value text shown in a design selector row, mirroring the web trigger label.
enum DesignChoiceLabel {
    static func title(selectedID: Int?, options: [(id: Int, name: String)], emptyLabel: String) -> String {
        selectedID.flatMap { id in options.first { $0.id == id }?.name } ?? emptyLabel
    }
    /// Web `DesignSelector` placeholder: "Use inherited default", or a prompt when there is no parent value.
    /// Web `DesignSelector` help shown, with the picker disabled, when the catalogue has no choices.
    static func unavailableHelp(glass: Bool) -> String {
        "\(glass ? "Glassware" : "Color palette") choices are unavailable. Try again shortly."
    }
    static func emptyLabel(hasInherited: Bool, prompt: String) -> String {
        hasInherited ? "Use inherited default" : prompt
    }
}

/// Palette or glass selector row: caption above, a bordered trigger with the chosen name, and the
/// resolved swatch or glass (selected, else inherited) drawn to its right, like the web `DesignSelector`.
struct DesignPickerRow: View {
    enum Preview { case palette(hex: String), glass(Glassware, chroma: String) }

    let title: String
    let options: [(id: Int, name: String)]
    let selection: Binding<Int?>
    let emptyLabel: String
    /// False when there is no inherited value: the empty choice is then only a prompt and cannot be picked.
    let hasInherited: Bool
    /// Set when the catalogue is empty: the trigger is disabled and this explains why.
    var unavailableHelp: String?
    let preview: Preview
    @Environment(ThemeStore.self) private var themeStore

    var body: some View {
        let theme = themeStore.theme
        let name = DesignChoiceLabel.title(selectedID: selection.wrappedValue, options: options, emptyLabel: emptyLabel)
        VStack(alignment: .leading, spacing: 6) {
            Text(title).font(theme.type.caption.font).foregroundStyle(theme.ink.secondary.color)
            HStack(spacing: 10) {
                Menu {
                    Picker(title, selection: selection) {
                        Text(emptyLabel).tag(Int?.none).disabled(!hasInherited)
                        ForEach(options, id: \.id) { Text($0.name).tag(Optional($0.id)) }
                    }
                } label: {
                    HStack {
                        Text(name).font(theme.type.body.font).foregroundStyle(theme.ink.primary.color)
                        Spacer(minLength: 0)
                        Image(systemName: "chevron.down").font(.caption2).foregroundStyle(theme.ink.tertiary.color)
                    }
                    .padding(.horizontal, theme.space.md).frame(minHeight: 44)
                    .background(theme.surface.recess.color, in: RoundedRectangle(cornerRadius: theme.radius.sm))
                    .overlay { RoundedRectangle(cornerRadius: theme.radius.sm).stroke(theme.ink.primary.color.opacity(0.52), lineWidth: 1.4) }
                    .contentShape(Rectangle())
                }
                .disabled(unavailableHelp != nil)
                .accessibilityLabel(title).accessibilityValue(name)
                previewView(theme).frame(width: 44, height: 44).accessibilityHidden(true)
            }
            if let unavailableHelp {
                Text(unavailableHelp).font(theme.type.caption.font).foregroundStyle(theme.ink.secondary.color)
            }
        }
    }

    @ViewBuilder private func previewView(_ theme: DrinkSaverTheme) -> some View {
        switch preview {
        case .palette(let hex):
            RoundedRectangle(cornerRadius: theme.radius.sm).fill(Color(hexString: hex, fallback: DesignCatalogue.fallbackPalette.field))
                .overlay { RoundedRectangle(cornerRadius: theme.radius.sm).stroke(theme.ink.primary.color.opacity(0.32), lineWidth: 1) }
        case .glass(let glass, let chroma):
            let tint = Color(hexString: chroma, fallback: DesignCatalogue.fallbackPalette.field)
            GlassArtwork(glassware: glass, outline: theme.ink.secondary.color, outlineWidth: 1.4, liquid: tint.opacity(0.6), foam: tint.opacity(0.85))
                .frame(width: 25, height: 38)
        }
    }
}
