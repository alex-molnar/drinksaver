import SwiftUI

@main
@MainActor
struct DrinkSaverApp: App {
    @State private var themeStore = ThemeStore()
    @State private var sessionStore: SessionStore
    @State private var designCatalogueStore: DesignCatalogueStore
    @State private var saveQueueStore: SaveQueueStore
    @State private var currentDrinkingDayStore: CurrentDrinkingDayStore
    @State private var quickSaveStore: QuickSaveStore
    @State private var addDrinkStore: AddDrinkStore
    @State private var historyStore: HistoryStore
    @State private var appCoordinator: AppCoordinator
    @Environment(\.scenePhase) private var scenePhase
#if UI_TESTING
    private let uiFixtureBootstrap: UITestFixtureBootstrap?
#endif

    init() {
#if UI_TESTING
        let fixture = UITestFixtureBootstrap.launchIfRequested(arguments: ProcessInfo.processInfo.arguments)
        uiFixtureBootstrap = fixture
        if let fixture {
            let coordinator = AppCoordinator()
            _appCoordinator = State(initialValue: coordinator)
            _sessionStore = State(initialValue: fixture.sessionStore)
            let catalogueStore = DesignCatalogueStore(api: fixture.api, sessionStore: fixture.sessionStore)
            _designCatalogueStore = State(initialValue: catalogueStore)
            let configuration = try? AppConfiguration.load()
            let queueStore = SaveQueueStore(api: fixture.api, sessionStore: fixture.sessionStore, configuration: configuration, clock: fixture.clock)
            _saveQueueStore = State(initialValue: queueStore)
            let dayStore = CurrentDrinkingDayStore(api: fixture.api, queueStore: queueStore, sessionStore: fixture.sessionStore, clock: fixture.clock)
            _currentDrinkingDayStore = State(initialValue: dayStore)
            _quickSaveStore = State(initialValue: QuickSaveStore(
                api: fixture.api,
                sessionStore: fixture.sessionStore,
                designCatalogueStore: catalogueStore,
                queueStore: queueStore,
                drinkingDayStore: dayStore,
                coordinator: coordinator
            ))
            _addDrinkStore = State(initialValue: AddDrinkStore(api: fixture.api, queue: queueStore, day: dayStore,
                designs: catalogueStore, session: fixture.sessionStore, coordinator: coordinator))
            _historyStore = State(initialValue: HistoryStore(api: fixture.api, queue: queueStore,
                drinkingDay: dayStore, session: fixture.sessionStore))
            return
        }
#endif
        let authorizationProvider: (any AuthorizationProviding)?
        let api: (any DrinkSaverAPI)?
        let configuration: AppConfiguration?
        do {
            let loadedConfiguration = try AppConfiguration.load()
            configuration = loadedConfiguration
            let appAuthClient = AppAuthClient(configuration: loadedConfiguration)
            authorizationProvider = appAuthClient
            api = APIClient(baseURL: loadedConfiguration.apiBaseURL, accessTokenProvider: appAuthClient)
        } catch {
            authorizationProvider = nil
            configuration = nil
            api = nil
        }
        let sessionStore = SessionStore(authorizationProvider: authorizationProvider)
        let coordinator = AppCoordinator()
        _sessionStore = State(initialValue: sessionStore)
        _appCoordinator = State(initialValue: coordinator)
        let queueStore = SaveQueueStore(api: api, sessionStore: sessionStore, configuration: configuration)
        _saveQueueStore = State(initialValue: queueStore)
        let dayStore = CurrentDrinkingDayStore(api: api, queueStore: queueStore, sessionStore: sessionStore)
        _currentDrinkingDayStore = State(initialValue: dayStore)
        let catalogueStore = DesignCatalogueStore(api: api, sessionStore: sessionStore)
        _designCatalogueStore = State(initialValue: catalogueStore)
        _quickSaveStore = State(initialValue: QuickSaveStore(
            api: api,
            sessionStore: sessionStore,
            designCatalogueStore: catalogueStore,
            queueStore: queueStore,
            drinkingDayStore: dayStore,
            coordinator: coordinator
        ))
        _addDrinkStore = State(initialValue: AddDrinkStore(api: api, queue: queueStore, day: dayStore,
            designs: catalogueStore, session: sessionStore, coordinator: coordinator))
        _historyStore = State(initialValue: HistoryStore(api: api, queue: queueStore,
            drinkingDay: dayStore, session: sessionStore))
    }

    var body: some Scene {
        WindowGroup {
            rootView
                .task(id: scenePhase == .active && sessionStore.userID != nil) {
                    guard scenePhase == .active, sessionStore.userID != nil else { return }
                    await currentDrinkingDayStore.refreshClockState()
                    while !Task.isCancelled {
                        do {
                            try await Task.sleep(for: .seconds(currentDrinkingDayStore.secondsUntilNextClockUpdate))
                        } catch {
                            return
                        }
                        await currentDrinkingDayStore.refreshClockState()
                    }
                }
                .onChange(of: scenePhase) { _, newPhase in
                    if newPhase == .background {
                        let pendingDeletes = saveQueueStore.applicationWillEnterBackground()
                        Task { await saveQueueStore.flushBackgroundDeletes(pendingDeletes) }
                    }
                }
        }
    }

    @ViewBuilder
    private var rootView: some View {
#if UI_TESTING
        if let fixture = uiFixtureBootstrap {
            configuredRootView
                .environment(\.uiFixtureAPI, fixture.api)
                .environment(\.uiFixtureClock, fixture.clock)
                .environment(\.uiFixtureIdentifier, fixture.fixture.identifier)
                .environment(\.uiFixtureReduceMotion, fixture.fixture.reduceMotion)
                .environment(\.locale, Locale(identifier: fixture.fixture.localeIdentifier))
                .environment(\.dynamicTypeSize, fixture.fixture.contentSize)
        } else {
            configuredRootView
        }
#else
        configuredRootView
#endif
    }

    private var configuredRootView: some View {
        RootView()
            .environment(themeStore)
            .environment(sessionStore)
            .environment(designCatalogueStore)
            .environment(saveQueueStore)
            .environment(currentDrinkingDayStore)
            .environment(quickSaveStore)
            .environment(addDrinkStore)
            .environment(historyStore)
            .environment(appCoordinator)
            .task { await sessionStore.restore() }
            .onOpenURL { _ = sessionStore.handleOpenURL($0) }
    }
}
