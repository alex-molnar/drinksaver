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
    private var catalogueSubject: String?

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
        catalogueSubject = nil
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
        // A retry keeps whatever endpoint already loaded, so one failure never discards the other; a new account starts empty.
        if catalogueSubject != subject { catalogue = DesignCatalogue(palettes: [], glassware: []) }
        state = .loading

        async let paletteResponse = Self.fetchPalettes(from: api)
        async let glasswareResponse = Self.fetchGlassware(from: api)
        let (palettes, glassware) = await (paletteResponse, glasswareResponse)

        guard generation == requestGeneration,
              sessionStore.userID == subject else { return }

        catalogueSubject = subject
        catalogue = DesignCatalogue(palettes: palettes ?? catalogue.palettes, glassware: glassware ?? catalogue.glassware)
        state = palettes != nil && glassware != nil ? .ready : .failed
    }

    private nonisolated static func fetchPalettes(from api: any DesignCatalogueLoading) async -> [Palette]? {
        try? await api.palettes()
    }

    private nonisolated static func fetchGlassware(from api: any DesignCatalogueLoading) async -> [Glassware]? {
        try? await api.glassware()
    }
}
