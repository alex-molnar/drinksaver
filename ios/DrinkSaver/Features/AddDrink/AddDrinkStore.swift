import Foundation
import Observation

struct AddDrinkDraft: Equatable {
    var alcoholType: AlcoholType?
    var volume: AlcoholVolume?
    var subtype: AlcoholSubtype?
    var consumptionType: ConsumptionType?
    var brand: Brand?
    var flavour: BeerFlavour?
    var date: Date?
    var notes = ""
    var quantity = 1
    var recommend = false
    var onlyTemporarily = false
    var name = ""
    var volumeLitres = "0.33"
    var colorPaletteId: Int?
    var glasswareId: Int?

    var isBeer: Bool { alcoholType?.name.caseInsensitiveCompare("Beer") == .orderedSame }
    mutating func select(_ type: AlcoholType) {
        guard alcoholType?.id != type.id else { return }
        alcoholType = type; volume = nil; subtype = nil; consumptionType = nil
        brand = nil; flavour = nil; colorPaletteId = type.colorPaletteId; glasswareId = type.glasswareId
    }
    mutating func select(_ brand: Brand) {
        guard self.brand?.id != brand.id else { return }
        self.brand = brand; flavour = nil; colorPaletteId = brand.colorPaletteId ?? alcoholType?.colorPaletteId
    }
    mutating func setRecommend(_ enabled: Bool) {
        recommend = enabled
        if !enabled { onlyTemporarily = false; name = "" }
    }
}

@MainActor
@Observable
final class AddDrinkStore {
    enum LoadState<Value: Equatable>: Equatable { case idle, loading, loaded(Value), failed }
    var draft = AddDrinkDraft()
    private(set) var alcoholTypes: LoadState<[AlcoholType]> = .idle
    private(set) var volumes: LoadState<[AlcoholVolume]> = .idle
    private(set) var subtypes: LoadState<[AlcoholSubtype]> = .idle
    private(set) var consumptionTypes: LoadState<[ConsumptionType]> = .idle
    private(set) var brands: LoadState<[Brand]> = .idle
    private(set) var flavours: LoadState<[BeerFlavour]> = .idle
    private(set) var isSaving = false
    private(set) var errorMessage: String?
    private let api: (any DrinkSaverAPI)?
    private let queue: SaveQueueStore
    private let day: CurrentDrinkingDayStore
    private let designs: DesignCatalogueStore
    private let session: SessionStore
    private let coordinator: AppCoordinator
    private var generation = 0
    var catalogue: DesignCatalogue { designs.catalogue }

    init(api: (any DrinkSaverAPI)?, queue: SaveQueueStore, day: CurrentDrinkingDayStore,
         designs: DesignCatalogueStore, session: SessionStore, coordinator: AppCoordinator) {
        self.api = api; self.queue = queue; self.day = day; self.designs = designs
        self.session = session; self.coordinator = coordinator
    }

    func reset() {
        generation += 1; draft = AddDrinkDraft(); alcoholTypes = .idle; volumes = .idle
        subtypes = .idle; consumptionTypes = .idle; brands = .idle; flavours = .idle
        errorMessage = nil; isSaving = false
        Task { await loadAlcoholTypes() }
    }
    func setQuantity(_ value: Int) { draft.quantity = Self.clampedQuantity(value) }
    func setRecommend(_ value: Bool) { draft.setRecommend(value) }
    func selectAlcoholType(_ value: AlcoholType) {
        guard draft.alcoholType?.id != value.id else { return }
        draft.select(value); volumes = .idle; subtypes = .idle
        Task { await loadVolumes() }; Task { await loadSubtypes() }
    }
    func selectBrand(_ value: Brand) {
        guard draft.brand?.id != value.id else { return }
        draft.select(value); flavours = .idle
        Task { await loadFlavours() }
    }

    func loadAlcoholTypes() async { alcoholTypes = await load { try await $0.alcoholTypes() } }
    func loadBrands() async { brands = await load { try await $0.brands() } }
    func loadVolumes() async {
        guard let id = draft.alcoholType?.id else { volumes = .loaded([]); return }
        let selected = id; volumes = .loading
        let result: LoadState<[AlcoholVolume]> = await load { try await $0.volumes(alcoholTypeID: selected) }
        guard draft.alcoholType?.id == selected else { return }; volumes = result
    }
    func loadSubtypes() async {
        guard let id = draft.alcoholType?.id else { subtypes = .loaded([]); return }
        let selected = id; subtypes = .loading
        let result: LoadState<[AlcoholSubtype]> = await load { try await $0.subtypes(alcoholTypeID: selected) }
        guard draft.alcoholType?.id == selected else { return }; subtypes = result
    }
    func loadConsumptionTypes() async {
        let amount = Int((draft.volume?.volume ?? 0.0) * 1000)
        consumptionTypes = await load { try await $0.consumptionTypes(amount: amount) }
    }
    func loadFlavours() async {
        guard let id = draft.brand?.id else { flavours = .loaded([]); return }
        let selected = id; flavours = .loading
        let result: LoadState<[BeerFlavour]> = await load { try await $0.flavours(brandID: selected) }
        guard draft.brand?.id == selected else { return }; flavours = result
    }

    func create(_ field: AddCreatableField, name: String, litres: Double? = nil) async {
        guard let api else { errorMessage = "Catalogue unavailable. Try again."; return }
        let clean = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !clean.isEmpty else { return }
        do {
            switch field {
            case .alcoholType:
                let value = try await api.createAlcoholType(NewAlcoholEntry(name: clean, colorPaletteId: draft.colorPaletteId, glasswareId: draft.glasswareId))
                if case .loaded(let items) = alcoholTypes { alcoholTypes = .loaded(items + [value]) }
                draft.select(value)
            case .volume:
                guard let id = draft.alcoholType?.id, let litres, litres.isFinite, litres > 0 else { return }
                let value = try await api.createVolume(alcoholTypeID: id, entry: NewVolumeEntry(name: clean, volume: Float(litres)))
                if case .loaded(let items) = volumes { volumes = .loaded(items + [value]) }; draft.volume = value
            case .subtype:
                guard let id = draft.alcoholType?.id else { return }
                let value = try await api.createSubtype(alcoholTypeID: id, entry: NewAlcoholSubtype(alcoholTypeId: id, name: clean, colorPaletteId: draft.colorPaletteId, glasswareId: draft.glasswareId))
                if case .loaded(let items) = subtypes { subtypes = .loaded(items + [value]) }; draft.subtype = value
            case .brand:
                let value = try await api.createBrand(NewBeerBrand(name: clean, colorPaletteId: draft.colorPaletteId))
                if case .loaded(let items) = brands { brands = .loaded(items + [value]) }; draft.select(value)
            case .flavour:
                guard let id = draft.brand?.id else { return }
                let value = try await api.createFlavour(brandID: id, entry: NewBeerFlavour(name: clean, colorPaletteId: draft.colorPaletteId))
                if case .loaded(let items) = flavours { flavours = .loaded(items + [value]) }; draft.flavour = value
            }
            coordinator.popAddPanel(); errorMessage = nil
        } catch { errorMessage = "Couldn’t add it. Try again." }
    }

    func save() {}

    func sessionDidSignOut() { generation += 1; draft = AddDrinkDraft(); errorMessage = nil }
    static func clampedQuantity(_ value: Int) -> Int { min(24, max(1, value)) }
    private func load<Value: Equatable>(_ request: (any DrinkSaverAPI) async throws -> Value) async -> LoadState<Value> {
        guard let api, session.userID != nil else { return .failed }
        let current = generation
        do { let value = try await request(api); guard current == generation, session.userID != nil else { return .idle }; return .loaded(value) }
        catch { return .failed }
    }
}
