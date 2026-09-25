import SwiftUI

struct RecommendationFeedbackView: View {
    @Environment(RecommendationsStore.self) private var store
    @Environment(ThemeStore.self) private var themeStore

    var body: some View {
        if let entry = store.queue.currentFeedback {
            HStack(spacing: 12) {
                Text(message(for: entry)).font(themeStore.theme.type.body.font)
                    .foregroundStyle(themeStore.theme.ink.primary.color)
                    .accessibilityIdentifier("recommendations.feedback.message")
                Spacer(minLength: 4)
                switch entry.status {
                case .undoable:
                    Button("Undo") { store.undoCurrent() }.accessibilityIdentifier("recommendations.feedback.undo")
                case .failed:
                    Button("Retry") { store.retryCurrent() }.accessibilityIdentifier("recommendations.feedback.retry")
                case .undoing:
                    ProgressView().accessibilityLabel("Undoing")
                case .sending, .committed, .undone:
                    EmptyView()
                }
            }
            .buttonStyle(.bordered).padding(.horizontal, 16).padding(.vertical, 10)
            .background(themeStore.theme.surface.panel.color)
            .overlay(alignment: .bottom) { Rectangle().fill(themeStore.theme.line.hairline.color).frame(height: 1) }
        }
    }

    private func message(for entry: RecommendationQueue.Entry) -> String {
        switch (entry.kind, entry.status) {
        case (.delete(_, let label), .undoable): "Crossed off \(label)"
        case (.delete(_, let label), .undoing): "Undoing \(label)…"
        case (.save, .undoable): "Saved recommendation changes"
        case (.save, .undoing): "Undoing recommendation changes…"
        case (_, .failed(let message)): message
        case (_, .sending), (_, .committed), (_, .undone): ""
        }
    }
}
