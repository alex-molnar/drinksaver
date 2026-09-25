import SwiftUI

struct RecommendationRowView: View {
    let row: SavedRecommendation
    let editing: Bool
    let exiting: Bool
    let reduceMotion: Bool
    let isSaving: Bool
    @Binding var editValue: String
    let onEdit: () -> Void
    let onCommit: () -> Void
    let onCancel: () -> Void
    let onDelete: () -> Void
    let onMoveUp: () -> Void
    let onMoveDown: () -> Void

    @Environment(ThemeStore.self) private var themeStore
    @FocusState private var nameFocused: Bool

    var body: some View {
        HStack(spacing: 10) {
            if editing {
                TextField("Recommendation name", text: $editValue)
                    .textFieldStyle(.roundedBorder)
                    .submitLabel(.done)
                    .focused($nameFocused)
                    .onSubmit(onCommit)
                    .accessibilityIdentifier("recommendations.rename.\(row.id)")
                Button("Done", action: onCommit).accessibilityLabel("Save name")
                Button("Cancel", action: onCancel).accessibilityLabel("Cancel name")
            } else {
                Text(row.name).font(themeStore.theme.type.body.font)
                    .foregroundStyle(themeStore.theme.ink.onPaper.color)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .fixedSize(horizontal: false, vertical: true)
                    .contentShape(Rectangle())
                    .onTapGesture(perform: onEdit)
                    .accessibilityIdentifier("recommendations.row.name.\(row.id)")
                Button("Rename", systemImage: "pencil", action: onEdit)
                    .labelStyle(.iconOnly)
                    .accessibilityLabel("Rename \(row.name)")
                    .accessibilityIdentifier("recommendations.rename-button.\(row.id)")
                    Button { onDelete() } label: { Image(systemName: "xmark").frame(width: 44, height: 44) }
                    .buttonStyle(.plain).accessibilityLabel("Cross off \(row.name)")
                    .accessibilityIdentifier("recommendations.delete.\(row.id)")
                VStack(spacing: 0) {
                    Button(action: onMoveUp) { Image(systemName: "arrow.up").frame(width: 44, height: 44) }
                        .accessibilityLabel("Move up \(row.name)")
                        .accessibilityIdentifier("recommendations.move-up.\(row.id)")
                    Button(action: onMoveDown) { Image(systemName: "arrow.down").frame(width: 44, height: 44) }
                        .accessibilityLabel("Move down \(row.name)")
                        .accessibilityIdentifier("recommendations.move-down.\(row.id)")
                }
            }
        }
        .padding(.horizontal, 14).padding(.vertical, 8)
        .background(themeStore.theme.surface.paper.color)
        .overlay(alignment: .bottom) { Rectangle().fill(themeStore.theme.ink.onPaper.color.opacity(0.1)).frame(height: 1) }
        .strikethrough(exiting)
        .opacity(exiting ? 0.35 : 1)
        .accessibilityElement(children: .contain)
        .accessibilityAction(named: Text("Move up"), onMoveUp)
        .accessibilityAction(named: Text("Move down"), onMoveDown)
        .animation(reduceMotion ? nil : .easeInOut(duration: 0.25), value: exiting)
        .onChange(of: editing) { _, value in nameFocused = value }
        .disabled(isSaving)
    }
}
