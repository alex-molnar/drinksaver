import SwiftUI

struct RecommendationTabView: View {
    @Environment(RecommendationsStore.self) private var store
    @Environment(ThemeStore.self) private var themeStore
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        VStack(spacing: 0) {
            HStack(alignment: .firstTextBaseline) {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Recommendations").font(themeStore.theme.type.displayM.font)
                    Text("\(store.visibleRows.count) saved").font(themeStore.theme.type.caption.font)
                        .accessibilityIdentifier("recommendations.count")
                }
                Spacer()
            }
            .foregroundStyle(themeStore.theme.ink.onPaper.color)
            .padding(.horizontal, 20).padding(.top, 22).padding(.bottom, 12)

            Group {
                switch store.state {
                case .loading:
                    ProgressView("Loading recommendations…").frame(maxWidth: .infinity, maxHeight: .infinity)
                        .accessibilityIdentifier("recommendations.loading")
                case .failed:
                    VStack(spacing: 10) {
                        Text("Couldn’t load recommendations.").foregroundStyle(themeStore.theme.accent.danger.color)
                        Button("Retry") { Task { await store.load() } }.accessibilityIdentifier("recommendations.retry")
                    }.frame(maxWidth: .infinity, maxHeight: .infinity)
                case .ready where store.displayedRows.isEmpty:
                    Text("No saved recommendations.").font(themeStore.theme.type.body.font)
                        .foregroundStyle(themeStore.theme.ink.secondary.color)
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                        .accessibilityIdentifier("recommendations.empty")
                case .ready:
                    ScrollView {
                        LazyVStack(spacing: 0) {
                            ForEach(store.displayedRows) { row in
                                RecommendationRowView(
                                    row: row,
                                    editing: store.draft.editingID == row.id,
                                    exiting: store.queue.hiddenIDs.contains(row.id) && store.exitTokens[row.id] != nil,
                                    reduceMotion: reduceMotion,
                                    isSaving: store.isSaving,
                                    editValue: Binding(get: { store.draft.editingValue }, set: { store.updateRename($0) }),
                                    onEdit: { store.beginRename(id: row.id) },
                                    onCommit: { store.commitRename() },
                                    onCancel: { store.cancelRename() },
                                    onDelete: { store.delete(id: row.id, reduceMotion: reduceMotion) },
                                    onMoveUp: { store.move(id: row.id, by: -1) },
                                    onMoveDown: { store.move(id: row.id, by: 1) }
                                )
                                .draggable(String(row.id))
                                .dropDestination(for: String.self) { items, _ in
                                    guard let movedID = items.first.flatMap(Int.init) else { return false }
                                    store.move(id: movedID, before: row.id)
                                    return true
                                }
                                .accessibilityIdentifier("recommendations.row.\(row.id)")
                            }
                        }
                    }
                    .scrollIndicators(.hidden)
                    .accessibilityIdentifier("recommendations.rows")
                    .animation(reduceMotion ? nil : .easeInOut(duration: 0.25), value: store.displayedRows)
                }
            }

            if store.isDirty {
                HStack(spacing: 12) {
                    Button("Cancel") { store.cancel() }
                        .buttonStyle(.bordered).frame(minHeight: 44).disabled(store.isSaving).accessibilityIdentifier("recommendations.cancel")
                    Button("Save") { store.save() }
                        .buttonStyle(.borderedProminent).frame(minHeight: 44).disabled(store.isSaving).accessibilityIdentifier("recommendations.save")
                }
                .padding(.horizontal, 20).padding(.vertical, 12)
            }
        }
        .background(themeStore.theme.surface.paper.color, in: RoundedRectangle(cornerRadius: themeStore.theme.radius.md))
        .padding(.horizontal, 10).padding(.top, 10).padding(.bottom, 8)
        .task { await store.load() }
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("recommendations.screen")
    }
}
