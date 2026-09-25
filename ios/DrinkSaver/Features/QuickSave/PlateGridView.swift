import SwiftUI

enum QuickSaveLayout {
    static let rotations: [Double] = [-0.7, 0.5, 0.8, -0.5, 0.4, -0.8, 0.6]

    static func rotation(at index: Int) -> Double {
        rotations[index % rotations.count]
    }

    static func rowCount(recommendationCount: Int) -> Int {
        (recommendationCount + 2) / 2
    }

    static func addPlatePosition(recommendationCount: Int) -> (row: Int, column: Int) {
        (recommendationCount / 2, recommendationCount % 2)
    }
}

struct PlateGridView: View {
    let recommendations: [Recommendation]
    let store: QuickSaveStore

    var body: some View {
        ScrollView {
            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 14) {
                ForEach(Array(recommendations.enumerated()), id: \.element.elementKey) { index, recommendation in
                    let key = QuickSaveStore.key(for: recommendation)
                    PlateView(
                        name: recommendation.name,
                        design: store.design(for: recommendation),
                        rotation: QuickSaveLayout.rotation(at: index),
                        status: status(for: key),
                        disabled: store.savingRecommendationKey != nil && store.savingRecommendationKey != key,
                        accessibilityIdentifier: "quick.plate.\(key)"
                    ) {
                        store.save(recommendation)
                    }
                }
                PlateView.add(
                    rotation: QuickSaveLayout.rotation(at: recommendations.count),
                    disabled: store.savingRecommendationKey != nil,
                    action: { store.openAdd() }
                )
                .accessibilityIdentifier("quick.plate.add")
            }
            .padding(.horizontal, 16)
            .padding(.top, 18)
            .padding(.bottom, 22)
        }
        .scrollIndicators(.hidden)
        .accessibilityIdentifier("quick.plate-grid")
    }

    private func status(for key: String) -> PlateView.Status {
        if store.savingRecommendationKey == key { return .saving }
        if store.doneRecommendationKey == key { return .done }
        return .idle
    }
}

private extension Recommendation {
    var elementKey: String { QuickSaveStore.key(for: self) }
}
