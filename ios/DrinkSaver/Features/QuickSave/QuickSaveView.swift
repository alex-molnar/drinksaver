import SwiftUI

struct QuickSaveView: View {
    @Environment(QuickSaveStore.self) private var store
    @Environment(SaveQueueStore.self) private var queueStore
    @Environment(ThemeStore.self) private var themeStore

    var body: some View {
        VStack(spacing: 0) {
            queueFeedback
            Group {
                switch store.state {
                case .loading:
                    PlateGridSkeleton()
                case .ready(let recommendations):
                    PlateGridView(recommendations: recommendations, store: store)
                case .failed:
                    failedContent
                }
            }
        }
        .task { await store.load() }
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("quick.screen")
    }

    @ViewBuilder
    private var queueFeedback: some View {
        if let entry = queueStore.currentFeedback {
            HStack(spacing: 12) {
                Text(queueMessage(for: entry))
                    .font(themeStore.theme.type.body.font)
                    .foregroundStyle(themeStore.theme.ink.primary.color)
                    .accessibilityIdentifier("quick.queue.message")
                Spacer(minLength: 4)
                switch entry.status {
                case .undoable:
                    Button("Undo") { queueStore.undoCurrent() }
                        .accessibilityIdentifier("quick.queue.undo")
                case .failed:
                    Button("Retry") { queueStore.retryCurrent() }
                        .accessibilityIdentifier("quick.queue.retry")
                case .undoing:
                    ProgressView().accessibilityLabel("Undoing")
                case .saving, .committed:
                    EmptyView()
                }
            }
            .buttonStyle(.bordered)
            .padding(.horizontal, 16)
            .padding(.vertical, 10)
            .background(themeStore.theme.surface.panel.color)
            .overlay(alignment: .bottom) {
                Rectangle().fill(themeStore.theme.line.hairline.color).frame(height: 1)
            }
        }
    }

    private func queueMessage(for entry: QueueEntry) -> String {
        let label: String
        switch entry.kind {
        case .save(let operation): label = operation.label
        case .delete(let operation): label = operation.label
        }
        return switch entry.status {
        case .undoable: "Saved \(label)"
        case .undoing: "Undoing \(label)…"
        case .failed(let failure): failure.message
        case .saving, .committed: ""
        }
    }

    private var failedContent: some View {
        VStack(spacing: 0) {
            Text("Couldn’t load recommendations. Add a drink instead.")
                .font(themeStore.theme.type.body.font)
                .foregroundStyle(themeStore.theme.accent.danger.color)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 18)
                .padding(.top, 16)
                .accessibilityIdentifier("quick.error")

            Button("Retry") { Task { await store.retry() } }
                .font(themeStore.theme.type.body.font.weight(.semibold))
                .foregroundStyle(themeStore.theme.accent.primary.color)
                .padding(.top, 8)
                .accessibilityIdentifier("quick.retry")

            PlateGridView(recommendations: [], store: store)
        }
        .accessibilityElement(children: .contain)
    }
}
