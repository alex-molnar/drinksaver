import Foundation
import Observation

@MainActor
@Observable
final class DesignCatalogueStore {
    enum State: Equatable {
        case idle
        case loading
        case ready
        case failed
    }

    private(set) var state: State = .idle
    private(set) var catalogue = DesignCatalogue(palettes: [], glassware: [])

    private let api: (any DesignCatalogueLoading)?
    private let sessionStore: SessionStore
    private var generation = 0

    init(api: (any DesignCatalogueLoading)?, sessionStore: SessionStore) {
        self.api = api
        self.sessionStore = sessionStore
    }

    func load() async {
        await fetchCatalogue()
    }

    func retry() async {
        await fetchCatalogue()
    }

    func sessionDidSignOut() {
        generation += 1
        catalogue = DesignCatalogue(palettes: [], glassware: [])
        state = .idle
    }

    private func fetchCatalogue() async {
        guard let subject = sessionStore.userID else {
            sessionDidSignOut()
            return
        }
        guard let api else {
            catalogue = DesignCatalogue(palettes: [], glassware: [])
            state = .failed
            return
        }

        generation += 1
        let requestGeneration = generation
        catalogue = DesignCatalogue(palettes: [], glassware: [])
        state = .loading

        async let paletteResponse = Self.fetchPalettes(from: api)
        async let glasswareResponse = Self.fetchGlassware(from: api)
        let (palettes, glassware) = await (paletteResponse, glasswareResponse)

        guard generation == requestGeneration,
              sessionStore.userID == subject else { return }

        catalogue = DesignCatalogue(palettes: palettes ?? [], glassware: glassware ?? [])
        state = palettes != nil && glassware != nil ? .ready : .failed
    }

    private nonisolated static func fetchPalettes(from api: any DesignCatalogueLoading) async -> [Palette]? {
        try? await api.palettes()
    }

    private nonisolated static func fetchGlassware(from api: any DesignCatalogueLoading) async -> [Glassware]? {
        try? await api.glassware()
    }
}
