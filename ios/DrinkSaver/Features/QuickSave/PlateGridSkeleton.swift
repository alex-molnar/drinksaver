import SwiftUI

struct PlateGridSkeleton: View {
    @Environment(ThemeStore.self) private var themeStore
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var shimmer = false

    private var theme: DrinkSaverTheme { themeStore.theme }

    var body: some View {
        ScrollView {
            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 14) {
                ForEach(0..<6, id: \.self) { index in
                    skeletonPlate
                        .rotationEffect(.degrees(QuickSaveLayout.rotation(at: index)))
                }
            }
            .padding(.horizontal, 16)
            .padding(.top, 18)
            .padding(.bottom, 22)
        }
        .scrollIndicators(.hidden)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Loading recommendations")
        .accessibilityAddTraits(.updatesFrequently)
        .accessibilityIdentifier("quick.loading")
        .task {
            guard !reduceMotion else { return }
            withAnimation(.easeInOut(duration: 1.1).repeatForever(autoreverses: true)) { shimmer = true }
        }
    }

    private var skeletonPlate: some View {
        VStack(alignment: .leading, spacing: 0) {
            RoundedRectangle(cornerRadius: 4)
                .fill(skeletonColor)
                .frame(width: 40, height: 58)
            RoundedRectangle(cornerRadius: 4)
                .fill(skeletonColor)
                .frame(width: 92, height: 13)
                .padding(.top, 10)
            RoundedRectangle(cornerRadius: 4)
                .fill(skeletonColor.opacity(0.75))
                .frame(width: 62, height: 9)
                .padding(.top, 6)
        }
        .padding(.horizontal, 13)
        .padding(.vertical, 14)
        .frame(maxWidth: .infinity, minHeight: 150, alignment: .bottomLeading)
        .background(theme.surface.paper.color, in: RoundedRectangle(cornerRadius: theme.radius.md))
        .opacity(shimmer ? 0.55 : 1)
        .accessibilityHidden(true)
    }

    private var skeletonColor: Color { theme.ink.onPaper.color.opacity(0.15) }
}
