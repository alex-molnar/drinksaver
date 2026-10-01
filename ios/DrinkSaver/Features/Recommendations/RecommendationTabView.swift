import SwiftUI

struct RecommendationTabView: View {
    @Environment(RecommendationsStore.self) private var store
    @Environment(ThemeStore.self) private var themeStore
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var rowFrames: [Int: CGRect] = [:]
    @State private var activeReorder: ActiveReorder?
    @State private var reorderHapticToken = 0

    private struct ActiveReorder {
        let id: Int
        let origin: CGRect
        var translationY: CGFloat = 0
        var didReorder = false
    }

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
            .overlay(alignment: .bottom) {
                Rectangle().fill(HistoryRowInk.headerRule(theme: themeStore.theme).color)
                    .frame(height: HistoryRowInk.headerRuleHeight)
            }

            Group {
                switch store.state {
                case .loading:
                    ProgressView("Loading recommendations…").frame(maxWidth: .infinity, maxHeight: .infinity)
                        .accessibilityIdentifier("recommendations.loading")
                case .failed:
                    VStack(spacing: 10) {
                        Text("Couldn’t load recommendations.").foregroundStyle(themeStore.theme.accent.danger.color)
                        Button("Retry") { Task { await store.load() } }.buttonStyle(.drinkSaver(.text, fillsWidth: false)).accessibilityIdentifier("recommendations.retry")
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
                                let isDragging = activeReorder?.id == row.id
                                let dragOffset = activeReorder.map {
                                    $0.id == row.id
                                        ? $0.origin.minY + $0.translationY - (rowFrames[row.id]?.minY ?? $0.origin.minY)
                                        : 0
                                } ?? 0
                                ZStack {
                                    RecommendationRowView(
                                        row: row,
                                        editing: store.draft.editingID == row.id,
                                        exiting: store.queue.hiddenIDs.contains(row.id) && store.exitTokens[row.id] != nil,
                                        isDragging: isDragging,
                                        reduceMotion: reduceMotion,
                                        isSaving: store.isSaving,
                                        editValue: Binding(get: { store.draft.editingValue }, set: { store.updateRename($0) }),
                                        onEdit: { store.beginRename(id: row.id) },
                                        onCommit: { store.commitRename() },
                                        onCancel: { store.cancelRename() },
                                        onDelete: { store.delete(id: row.id, reduceMotion: reduceMotion) },
                                        onMoveUp: { store.move(id: row.id, by: -1) },
                                        onMoveDown: { store.move(id: row.id, by: 1) },
                                        onReorderDragStart: { beginReorder(id: row.id) },
                                        onReorderDragChange: { updateReorder(id: row.id, translationY: $0) },
                                        onReorderDragEnd: { endReorder(id: row.id) }
                                    )
                                    .offset(y: dragOffset)
                                }
                                .zIndex(isDragging ? 1 : 0)
                                .background {
                                    GeometryReader { geometry in
                                        Color.clear.preference(
                                            key: RecommendationRowFramesKey.self,
                                            value: [row.id: geometry.frame(in: .named("recommendationRows"))]
                                        )
                                    }
                                }
                                .accessibilityIdentifier("recommendations.row.\(row.id)")
                                .onDisappear { if isDragging { endReorder(id: row.id) } }
                            }
                        }
                    }
                    .scrollIndicators(.hidden)
                    .coordinateSpace(name: "recommendationRows")
                    .onPreferenceChange(RecommendationRowFramesKey.self) { rowFrames = $0 }
                    .accessibilityIdentifier("recommendations.rows")
                    .animation(reduceMotion ? nil : .easeInOut(duration: 0.25), value: store.displayedRows)
                }
            }

            if store.isDirty {
                HStack(spacing: 12) {
                    Button("Cancel") { store.cancel() }
                        .buttonStyle(.drinkSaver(.secondary, onPaper: true)).disabled(store.isSaving).accessibilityIdentifier("recommendations.cancel")
                    Button("Save") { store.save() }
                        .buttonStyle(.drinkSaver()).disabled(store.isSaving).accessibilityIdentifier("recommendations.save")
                }
                .padding(.horizontal, 20).padding(.vertical, 12)
            }
        }
        .background(themeStore.theme.surface.paper.color, in: RoundedRectangle(cornerRadius: themeStore.theme.radius.md))
        .padding(.horizontal, 10).padding(.top, 10).padding(.bottom, 8)
        .task { await store.load() }
        .sensoryFeedback(.selection, trigger: reorderHapticToken)
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("recommendations.screen")
    }

    private func beginReorder(id: Int) {
        guard activeReorder == nil, !store.isSaving, store.draft.editingID == nil,
              let origin = rowFrames[id] else { return }
        activeReorder = ActiveReorder(id: id, origin: origin)
    }

    private func updateReorder(id: Int, translationY: CGFloat) {
        guard var drag = activeReorder, drag.id == id else { return }
        drag.translationY = translationY
        activeReorder = drag

        let rows = store.visibleRows
        let centerY = drag.origin.midY + translationY
        guard let target = rows
            .filter({ $0.id != id })
            .compactMap({ row -> (SavedRecommendation, CGRect)? in rowFrames[row.id].map { (row, $0) } })
            .min(by: { abs($0.1.midY - centerY) < abs($1.1.midY - centerY) }) else { return }

        var nextOrder = rows.map(\.id)
        nextOrder.removeAll { $0 == id }
        guard let targetIndex = nextOrder.firstIndex(of: target.0.id) else { return }
        let insertIndex = centerY < target.1.midY ? targetIndex : targetIndex + 1
        nextOrder.insert(id, at: insertIndex)
        guard nextOrder != rows.map(\.id) else { return }

        withAnimation(reduceMotion ? nil : .interactiveSpring(response: 0.25, dampingFraction: 0.88)) {
            store.reorder(visibleIDs: nextOrder)
        }
        drag.didReorder = true
        activeReorder = drag
    }

    private func endReorder(id: Int) {
        guard let drag = activeReorder, drag.id == id else { return }
        activeReorder = nil
        if drag.didReorder { reorderHapticToken += 1 }
    }
}

private struct RecommendationRowFramesKey: PreferenceKey {
    static let defaultValue: [Int: CGRect] = [:]

    static func reduce(value: inout [Int: CGRect], nextValue: () -> [Int: CGRect]) {
        value.merge(nextValue(), uniquingKeysWith: { _, new in new })
    }
}
