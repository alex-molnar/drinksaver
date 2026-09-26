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
    var creationName = ""
    var recommendationName = ""
    var volumeLitres = "0.33"
    var newEntryColorPaletteId: Int?
    var newEntryGlasswareId: Int?
    var recommendationColorPaletteId: Int?
    var recommendationGlasswareId: Int?

    var isBeer: Bool { alcoholType?.name.caseInsensitiveCompare("Beer") == .orderedSame }
    mutating func select(_ type: AlcoholType) {
        guard alcoholType?.id != type.id else { return }
        alcoholType = type; volume = nil; subtype = nil; consumptionType = nil
        brand = nil; flavour = nil
    }
    mutating func select(_ brand: Brand) {
        guard self.brand?.id != brand.id else { return }
        self.brand = brand; flavour = nil
    }
    mutating func select(_ flavour: BeerFlavour) {
        self.flavour = flavour
    }
    mutating func setRecommend(_ enabled: Bool) {
        recommend = enabled
        if !enabled {
            onlyTemporarily = false
            recommendationName = ""
            recommendationColorPaletteId = nil
            recommendationGlasswareId = nil
        }
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
    private var selectionRevision = 0
    private var activeCreateID: UUID?
    var isCreating: Bool { activeCreateID != nil }
    var catalogue: DesignCatalogue { designs.catalogue }

    init(api: (any DrinkSaverAPI)?, queue: SaveQueueStore, day: CurrentDrinkingDayStore,
         designs: DesignCatalogueStore, session: SessionStore, coordinator: AppCoordinator) {
        self.api = api; self.queue = queue; self.day = day; self.designs = designs
        self.session = session; self.coordinator = coordinator
    }

    func reset() {
        generation += 1; selectionRevision += 1; activeCreateID = nil
        draft = AddDrinkDraft(); draft.date = Self.date(forISODate: day.date)
        alcoholTypes = .idle; volumes = .idle
        subtypes = .idle; consumptionTypes = .idle; brands = .idle; flavours = .idle
        errorMessage = nil; isSaving = false
        Task { await loadAlcoholTypes() }
    }
    func setQuantity(_ value: Int) { draft.quantity = Self.clampedQuantity(value) }
    func setRecommend(_ value: Bool) { draft.setRecommend(value) }
    func selectAlcoholType(_ value: AlcoholType) {
        guard draft.alcoholType?.id != value.id else { return }
        selectionRevision += 1
        draft.select(value); volumes = .idle; subtypes = .idle
        Task { await loadVolumes() }; Task { await loadSubtypes() }
    }
    func selectBrand(_ value: Brand) {
        guard draft.brand?.id != value.id else { return }
        selectionRevision += 1
        draft.select(value); flavours = .idle
        Task { await loadFlavours() }
    }
    func selectVolume(_ value: AlcoholVolume?) { guard draft.volume != value else { return }; selectionRevision += 1; draft.volume = value }
    func selectSubtype(_ value: AlcoholSubtype?) { guard draft.subtype != value else { return }; selectionRevision += 1; draft.subtype = value }
    func selectConsumptionType(_ value: ConsumptionType?) { guard draft.consumptionType != value else { return }; selectionRevision += 1; draft.consumptionType = value }
    func selectFlavour(_ value: BeerFlavour) {
        guard draft.flavour?.id != value.id else { return }
        selectionRevision += 1
        draft.select(value)
    }
    func setRecommendationDesign(colorPaletteId: Int?, glasswareId: Int?) {
        draft.recommendationColorPaletteId = colorPaletteId
        draft.recommendationGlasswareId = glasswareId
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
        consumptionTypes = await load { try await $0.consumptionTypes(amount: 100) }
    }
    func loadFlavours() async {
        guard let id = draft.brand?.id else { flavours = .loaded([]); return }
        let selected = id; flavours = .loading
        let result: LoadState<[BeerFlavour]> = await load { try await $0.flavours(brandID: selected) }
        guard draft.brand?.id == selected else { return }; flavours = result
    }

    func create(_ field: AddCreatableField, name: String, litres: Double? = nil) async {
        guard !isCreating else { return }
        guard let api else { errorMessage = "Catalogue unavailable. Try again."; return }
        let clean = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !clean.isEmpty else { return }
        let createID = UUID()
        activeCreateID = createID
        let requestGeneration = generation
        let requestRevision = selectionRevision
        defer { if activeCreateID == createID { activeCreateID = nil } }
        do {
            switch field {
            case .alcoholType:
                let value = try await api.createAlcoholType(NewAlcoholEntry(name: clean, colorPaletteId: draft.newEntryColorPaletteId, glasswareId: draft.newEntryGlasswareId))
                guard requestGeneration == generation, requestRevision == selectionRevision else { return }
                if case .loaded(let items) = alcoholTypes { alcoholTypes = .loaded(items + [value]) }
                draft.select(value); selectionRevision += 1
            case .volume:
                guard let id = draft.alcoholType?.id, let litres, litres.isFinite, litres > 0 else { return }
                let value = try await api.createVolume(alcoholTypeID: id, entry: NewVolumeEntry(name: clean, volume: Float(litres)))
                guard requestGeneration == generation, requestRevision == selectionRevision, draft.alcoholType?.id == id else { return }
                if case .loaded(let items) = volumes { volumes = .loaded(items + [value]) }; draft.volume = value
            case .subtype:
                guard let id = draft.alcoholType?.id else { return }
                let value = try await api.createSubtype(alcoholTypeID: id, entry: NewAlcoholSubtype(alcoholTypeId: id, name: clean, colorPaletteId: draft.newEntryColorPaletteId, glasswareId: draft.newEntryGlasswareId))
                guard requestGeneration == generation, requestRevision == selectionRevision, draft.alcoholType?.id == id else { return }
                if case .loaded(let items) = subtypes { subtypes = .loaded(items + [value]) }; draft.subtype = value
            case .brand:
                let value = try await api.createBrand(NewBeerBrand(name: clean, colorPaletteId: draft.newEntryColorPaletteId))
                guard requestGeneration == generation, requestRevision == selectionRevision else { return }
                if case .loaded(let items) = brands { brands = .loaded(items + [value]) }; draft.select(value)
            case .flavour:
                guard let id = draft.brand?.id else { return }
                let value = try await api.createFlavour(brandID: id, entry: NewBeerFlavour(name: clean, colorPaletteId: draft.newEntryColorPaletteId))
                guard requestGeneration == generation, requestRevision == selectionRevision, draft.brand?.id == id else { return }
                if case .loaded(let items) = flavours { flavours = .loaded(items + [value]) }; draft.select(value)
            }
            draft.creationName = ""
            draft.newEntryColorPaletteId = nil
            draft.newEntryGlasswareId = nil
            selectionRevision += 1
            coordinator.popAddPanel(); errorMessage = nil
        } catch { errorMessage = "Couldn’t add it. Try again." }
    }

    func save() {
        guard !isSaving, let type = draft.alcoholType, let volume = draft.volume else { errorMessage = "Choose a drink and size first."; return }
        let date = draft.date.map(Self.apiDate) ?? day.date
        let request = Self.makeRequest(type: type, volume: volume, draft: draft, date: date)
        isSaving = true; errorMessage = nil
        _ = queue.save(SaveOperation(label: Self.provisionalLabel(draft, fallback: type.name), date: date, alcoholTypeID: type.id, payload: request,
                                     rowCountBaseline: day.state == .ready ? day.serverRowCount : nil))
        coordinator.dismissAdd()
    }
    func sessionDidSignOut() { generation += 1; selectionRevision += 1; activeCreateID = nil; draft = AddDrinkDraft(); errorMessage = nil }

    static func makeRequest(type: AlcoholType, volume: AlcoholVolume, draft: AddDrinkDraft, date: String) -> DrinkSaveRequest {
        let notes = draft.notes.trimmingCharacters(in: .whitespacesAndNewlines)
        let quantity = draft.quantity == 1 ? nil : draft.quantity
        let inheritedPalette = draft.isBeer
            ? draft.flavour?.colorPaletteId ?? draft.brand?.colorPaletteId ?? type.colorPaletteId
            : draft.subtype?.colorPaletteId ?? type.colorPaletteId
        let inheritedGlassware = draft.isBeer
            ? draft.consumptionType?.glasswareId
            : draft.subtype?.glasswareId ?? type.glasswareId
        let colorPaletteId = draft.recommend ? draft.recommendationColorPaletteId ?? inheritedPalette : inheritedPalette
        let glasswareId = draft.recommend ? draft.recommendationGlasswareId ?? inheritedGlassware : inheritedGlassware
        return DrinkSaveRequest(date: date, alcoholTypeId: type.id, alcoholSubtypeId: draft.subtype?.id,
            alcoholVolumeId: volume.id, brandId: draft.isBeer ? draft.brand?.id : nil,
            beerFlavourId: draft.isBeer ? draft.flavour?.id : nil,
            consumptionTypeId: draft.isBeer ? draft.consumptionType?.id : nil,
            colorPaletteId: colorPaletteId, glasswareId: glasswareId,
            comments: notes.isEmpty ? nil : notes, quantity: quantity, addToRecommendations: draft.recommend ? true : nil,
            onlyTemporarily: draft.recommend && draft.onlyTemporarily ? true : nil,
            name: draft.recommend && !draft.recommendationName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? draft.recommendationName.trimmingCharacters(in: .whitespacesAndNewlines) : nil)
    }
    static func provisionalLabel(_ draft: AddDrinkDraft, fallback: String? = nil) -> String {
        [draft.brand?.name, draft.flavour?.name, draft.alcoholType?.name ?? fallback].compactMap { $0 }.joined(separator: " ")
    }
    static func date(forISODate value: String) -> Date? {
        let parts = value.split(separator: "-").compactMap { Int($0) }
        guard parts.count == 3 else { return nil }
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = .current
        return calendar.date(from: DateComponents(year: parts[0], month: parts[1], day: parts[2], hour: 12))
    }
    static func clampedQuantity(_ value: Int) -> Int { min(24, max(1, value)) }
    static func apiDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.timeZone = .current
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.string(from: date)
    }
    private func load<Value: Equatable>(_ request: (any DrinkSaverAPI) async throws -> Value) async -> LoadState<Value> {
        guard let api, session.userID != nil else { return .failed }
        let current = generation
        do { let value = try await request(api); guard current == generation, session.userID != nil else { return .idle }; return .loaded(value) }
        catch { return .failed }
    }
}
