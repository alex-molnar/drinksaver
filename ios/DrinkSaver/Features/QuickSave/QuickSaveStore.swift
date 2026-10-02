import Foundation
import Observation

@MainActor
@Observable
final class QuickSaveStore {
    enum State: Equatable {
        case loading
        case ready([Recommendation])
        case failed
    }

    private(set) var state: State = .loading
    private(set) var activeRecommendationKey: String?
    var currentDayCount: Int { drinkingDayStore.visibleCount }

    var savingRecommendationKey: String? {
        guard let entry = activeQueueEntry, case .saving = entry.status else { return nil }
        return activeRecommendationKey
    }

    var doneRecommendationKey: String? {
        guard let entry = activeQueueEntry, case .undoable = entry.status else { return nil }
        return activeRecommendationKey
    }

    private let api: (any DrinkSaverAPI)?
    private let sessionStore: SessionStore
    private let designCatalogueStore: DesignCatalogueStore
    private let queueStore: SaveQueueStore
    private let drinkingDayStore: CurrentDrinkingDayStore
    private let coordinator: AppCoordinator
    private var activeQueueEntryID: UUID?
    private var generation = 0
    private var isLoading = false
    private var hasLoaded = false
    private var refreshWhenQueueIdle = false
    private var refreshedDayAfterSaveIDs = Set<UUID>()

    init(
        api: (any DrinkSaverAPI)?,
        sessionStore: SessionStore,
        designCatalogueStore: DesignCatalogueStore,
        queueStore: SaveQueueStore,
        drinkingDayStore: CurrentDrinkingDayStore,
        coordinator: AppCoordinator
    ) {
        self.api = api
        self.sessionStore = sessionStore
        self.designCatalogueStore = designCatalogueStore
        self.queueStore = queueStore
        self.drinkingDayStore = drinkingDayStore
        self.coordinator = coordinator
    }

    func load() async {
        guard !isLoading else { return }
        guard !queueHasInFlightOperation else {
            refreshWhenQueueIdle = true
            return
        }
        guard !hasLoaded || refreshWhenQueueIdle || isFailed else { return }
        guard let api else {
            state = .failed
            hasLoaded = true
            return
        }

        generation += 1
        let requestGeneration = generation
        let subject = sessionStore.userID
        guard subject != nil else { state = .failed; return }
        isLoading = true
        state = .loading
        defer { isLoading = false }
        do {
            let recommendations = try await api.recommendations()
            guard generation == requestGeneration, sessionStore.userID == subject else { return }
            state = .ready(recommendations)
            hasLoaded = true
            refreshWhenQueueIdle = false
        } catch {
            guard generation == requestGeneration, sessionStore.userID == subject else { return }
            state = .failed
            hasLoaded = true
            refreshWhenQueueIdle = false
        }
    }

    func retry() async {
        hasLoaded = false
        await load()
    }

    func openAdd() { coordinator.presentAdd() }

    func sessionDidSignOut() {
        generation += 1
        activeQueueEntryID = nil
        activeRecommendationKey = nil
        hasLoaded = false
        refreshWhenQueueIdle = false
        refreshedDayAfterSaveIDs.removeAll()
        state = .loading
    }

    func queueDidChange() {
        let queuedSaveIDs = Set(queueStore.state.entries.compactMap { entry -> UUID? in
            guard case .save = entry.kind else { return nil }
            return entry.id
        })
        refreshedDayAfterSaveIDs.formIntersection(queuedSaveIDs)
        for entry in queueStore.state.entries where !refreshedDayAfterSaveIDs.contains(entry.id) {
            guard case .save = entry.kind else { continue }
            switch entry.status {
            case .undoable, .committed:
                refreshedDayAfterSaveIDs.insert(entry.id)
                Task { await drinkingDayStore.load() }
            case .saving, .undoing, .failed:
                continue
            }
        }
        guard refreshWhenQueueIdle, !queueHasInFlightOperation, !isLoading else { return }
        Task { await load() }
    }

    func design(for recommendation: Recommendation) -> ResolvedDrinkDesign {
        DesignResolver.resolve(
            paletteID: recommendation.colorPaletteId,
            glasswareID: recommendation.glasswareId,
            in: designCatalogueStore.catalogue
        )
    }

    func save(_ recommendation: Recommendation) {
        guard !queueHasNetworkOperation,
              case .ready(let recommendations) = state,
              recommendations.contains(where: { Self.key(for: $0) == Self.key(for: recommendation) }),
              let alcoholTypeID = recommendation.alcoholTypeId,
              let alcoholVolumeID = recommendation.alcoholVolumeId else { return }

        let request = DrinkSaveRequest(
            date: drinkingDayStore.date,
            alcoholTypeId: alcoholTypeID,
            alcoholSubtypeId: recommendation.alcoholSubtypeId,
            alcoholVolumeId: alcoholVolumeID,
            brandId: recommendation.brandId,
            beerFlavourId: recommendation.beerFlavourId,
            consumptionTypeId: recommendation.consumptionTypeId,
            colorPaletteId: recommendation.colorPaletteId,
            glasswareId: recommendation.glasswareId
        )
        let entryID = queueStore.save(SaveOperation(
            label: recommendation.name,
            date: drinkingDayStore.date,
            alcoholTypeID: alcoholTypeID,
            payload: request,
            rowCountBaseline: drinkingDayStore.state == .ready ? drinkingDayStore.serverRowCount : nil
        ))
        activeRecommendationKey = Self.key(for: recommendation)
        activeQueueEntryID = entryID
        refreshWhenQueueIdle = true
    }

    nonisolated static func key(for recommendation: Recommendation) -> String {
        "\(recommendation.id.map(String.init) ?? "null")-\(recommendation.alcoholTypeId.map(String.init) ?? "null")-\(recommendation.alcoholVolumeId.map(String.init) ?? "null")-\(recommendation.brandId.map(String.init) ?? "null")"
    }

    private var isFailed: Bool {
        if case .failed = state { return true }
        return false
    }

    private var queueHasInFlightOperation: Bool {
        queueStore.state.entries.contains { entry in
            switch entry.status {
            case .saving, .undoing: true
            case .failed, .committed: false
            case .undoable: true
            }
        }
    }

    private var queueHasNetworkOperation: Bool {
        queueStore.state.entries.contains { entry in
            switch entry.status {
            case .saving, .undoing: true
            case .undoable, .failed, .committed: false
            }
        }
    }

    private var activeQueueEntry: QueueEntry? {
        guard let activeQueueEntryID else { return nil }
        return queueStore.state.entries.first { $0.id == activeQueueEntryID }
    }
}
