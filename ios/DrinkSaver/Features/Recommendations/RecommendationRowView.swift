import SwiftUI

struct RecommendationRowView: View {
    let row: SavedRecommendation
    let editing: Bool
    let exiting: Bool
    let isDragging: Bool
    let reduceMotion: Bool
    let isSaving: Bool
    @Binding var editValue: String
    @FocusState.Binding var nameFocused: Bool
    let onEdit: () -> Void
    let onCommit: () -> Void
    let onCancel: () -> Void
    let onDelete: () -> Void
    let onMoveUp: () -> Void
    let onMoveDown: () -> Void
    let onReorderDragStart: () -> Void
    let onReorderDragChange: (CGFloat) -> Void
    let onReorderDragEnd: () -> Void

    @Environment(ThemeStore.self) private var themeStore
    @GestureState private var reorderGestureActive = false

    private func iconButton(_ symbol: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: symbol)
                .foregroundStyle(RecommendationRowStyle.icon(theme: themeStore.theme).color)
                .frame(minWidth: RecommendationRowStyle.hitSize, minHeight: RecommendationRowStyle.hitSize)
                .contentShape(Rectangle())
                .opacity(isSaving ? 0.4 : 1)
        }
        .buttonStyle(.plain)
    }

    private func actionButton(_ symbol: String, label: String, id: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: symbol)
                .font(themeStore.theme.type.body.font.weight(.semibold))
                .foregroundStyle(RecommendationRowStyle.editAction(theme: themeStore.theme).color)
                .frame(minWidth: RecommendationRowStyle.hitSize, minHeight: RecommendationRowStyle.hitSize)
                .contentShape(Rectangle())
                .opacity(isSaving ? 0.4 : 1)
        }
        .buttonStyle(.plain)
        .accessibilityLabel(label)
        .accessibilityIdentifier(id)
    }

    /// Web's six dot grip: two columns by three rows.
    private var grip: some View {
        VStack(spacing: 4) {
            ForEach(0..<3, id: \.self) { _ in
                HStack(spacing: 3) { Circle().frame(width: 3.5, height: 3.5); Circle().frame(width: 3.5, height: 3.5) }
            }
        }
        .foregroundStyle(RecommendationRowStyle.grip(theme: themeStore.theme).color)
        .frame(width: 20, height: RecommendationRowStyle.hitSize)
        .contentShape(Rectangle())
        // Decorative: drag is not reachable by VoiceOver, the row's Move up/Move down actions cover it.
        .accessibilityHidden(true)
    }

    private var reorderGesture: some Gesture {
        DragGesture(minimumDistance: 4, coordinateSpace: .global)
            .updating($reorderGestureActive) { _, active, _ in active = true }
            .onChanged { value in
                onReorderDragStart()
                onReorderDragChange(value.translation.height)
            }
    }

    var body: some View {
        HStack(spacing: 10) {
            if editing {
                // Dimmed while editing, like web, so the field does not jump left.
                grip.opacity(0.4)
                TextField("Recommendation name", text: $editValue,
                          prompt: Text("Recommendation name").foregroundStyle(DrinkSaverFieldTone.paperPlaceholder(theme: themeStore.theme).color))
                    .drinkSaverField(focus: $nameFocused, onPaper: true)
                    .submitLabel(.done)
                    .onSubmit(onCommit)
                    .accessibilityIdentifier("recommendations.rename.\(row.id)")
                actionButton(RecommendationRowStyle.commitSymbol, label: "Save name", id: "recommendations.rename-done.\(row.id)", action: onCommit)
                actionButton(RecommendationRowStyle.cancelSymbol, label: "Cancel name", id: "recommendations.rename-cancel.\(row.id)", action: onCancel)
            } else {
                grip.gesture(reorderGesture)
                Text(row.name).font(themeStore.theme.type.body.font)
                    .foregroundStyle(themeStore.theme.ink.onPaper.color)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .fixedSize(horizontal: false, vertical: true)
                    .frame(minHeight: 44)
                    .contentShape(Rectangle())
                    .onTapGesture(perform: onEdit)
                    .accessibilityIdentifier("recommendations.row.name.\(row.id)")
                iconButton("pencil", action: onEdit)
                    .accessibilityLabel("Rename \(row.name)")
                    .accessibilityIdentifier("recommendations.rename-button.\(row.id)")
                VStack(spacing: 0) {
                    iconButton("arrow.up", action: onMoveUp)
                        .accessibilityLabel("Move up \(row.name)")
                        .accessibilityIdentifier("recommendations.move-up.\(row.id)")
                    iconButton("arrow.down", action: onMoveDown)
                        .accessibilityLabel("Move down \(row.name)")
                        .accessibilityIdentifier("recommendations.move-down.\(row.id)")
                }
                iconButton("trash", action: onDelete)
                    .accessibilityLabel("Delete \(row.name)")
                    .accessibilityIdentifier("recommendations.delete.\(row.id)")
            }
        }
        .padding(.horizontal, 14).padding(.vertical, 8)
        .background(themeStore.theme.surface.paper.color)
        .overlay(alignment: .bottom) { Rectangle().fill(themeStore.theme.ink.onPaper.color.opacity(0.1)).frame(height: 1) }
        .strikethrough(exiting)
        .opacity(exiting ? 0.35 : 1)
        .accessibilityElement(children: .contain)
        .onChange(of: reorderGestureActive) { wasActive, isActive in
            if wasActive && !isActive { onReorderDragEnd() }
        }
        .accessibilityAction(named: Text("Move up"), onMoveUp)
        .accessibilityAction(named: Text("Move down"), onMoveDown)
        .animation(reduceMotion ? nil : .easeInOut(duration: 0.25), value: exiting)
        .shadow(color: isDragging ? .black.opacity(0.2) : .clear, radius: 8, y: 3)
        .disabled(isSaving)
    }
}

/// Row controls sit on the paper surface, which stays light in dark mode, so they take
/// `ink.onPaper` like web instead of the default blue tint.
enum RecommendationRowStyle {
    static let hitSize: CGFloat = 44

    static func icon(theme: DrinkSaverTheme) -> ThemeColor {
        ThemeColor(hex: theme.ink.onPaper.hex, opacity: 0.6)
    }

    static func grip(theme: DrinkSaverTheme) -> ThemeColor { icon(theme: theme) }
}

extension RecommendationRowStyle {
    static let commitSymbol = "checkmark"
    static let cancelSymbol = "xmark"

    /// Check and x glyphs: full paper ink, not the 60% row icon tone, so they clear 4.5:1.
    static func editAction(theme: DrinkSaverTheme) -> ThemeColor { theme.ink.onPaper }
}
