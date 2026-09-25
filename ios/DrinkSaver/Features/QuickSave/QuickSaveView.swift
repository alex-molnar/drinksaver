import SwiftUI

struct QuickSaveView: View {
    @Environment(QuickSaveStore.self) private var store
    @Environment(SaveQueueStore.self) private var queueStore
    @Environment(ThemeStore.self) private var themeStore

    var body: some View {
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
        .task { await store.load() }
        .onChange(of: queueStore.state) { _, _ in store.queueDidChange() }
        .accessibilityIdentifier("quick.screen")
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
