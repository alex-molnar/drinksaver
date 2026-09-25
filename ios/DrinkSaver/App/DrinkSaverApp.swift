import SwiftUI

@main
@MainActor
struct DrinkSaverApp: App {
    @State private var themeStore = ThemeStore()
    @State private var sessionStore: SessionStore
    @State private var designCatalogueStore: DesignCatalogueStore
    @State private var saveQueueStore: SaveQueueStore
    @Environment(\.scenePhase) private var scenePhase
#if UI_TESTING
    private let uiFixtureBootstrap: UITestFixtureBootstrap?
#endif

    init() {
#if UI_TESTING
        let fixture = UITestFixtureBootstrap.launchIfRequested(arguments: ProcessInfo.processInfo.arguments)
        uiFixtureBootstrap = fixture
        if let fixture {
            _sessionStore = State(initialValue: fixture.sessionStore)
            _designCatalogueStore = State(initialValue: DesignCatalogueStore(api: fixture.api, sessionStore: fixture.sessionStore))
            let configuration = try? AppConfiguration.load()
            _saveQueueStore = State(initialValue: SaveQueueStore(api: fixture.api, sessionStore: fixture.sessionStore, configuration: configuration))
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
        _sessionStore = State(initialValue: sessionStore)
        _designCatalogueStore = State(initialValue: DesignCatalogueStore(api: api, sessionStore: sessionStore))
        _saveQueueStore = State(initialValue: SaveQueueStore(api: api, sessionStore: sessionStore, configuration: configuration))
    }

    var body: some Scene {
        WindowGroup {
            rootView
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
            .task { await sessionStore.restore() }
            .onOpenURL { _ = sessionStore.handleOpenURL($0) }
    }
}
