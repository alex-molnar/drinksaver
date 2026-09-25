import SwiftUI

@main
@MainActor
struct DrinkSaverApp: App {
    @State private var themeStore = ThemeStore()
    @State private var sessionStore: SessionStore
#if UI_TESTING
    private let uiFixtureBootstrap: UITestFixtureBootstrap?
#endif

    init() {
#if UI_TESTING
        let fixture = UITestFixtureBootstrap.launchIfRequested(arguments: ProcessInfo.processInfo.arguments)
        uiFixtureBootstrap = fixture
        if let fixture {
            _sessionStore = State(initialValue: fixture.sessionStore)
            return
        }
#endif
        let authorizationProvider: (any AuthorizationProviding)?
        do {
            authorizationProvider = AppAuthClient(configuration: try AppConfiguration.load())
        } catch {
            authorizationProvider = nil
        }
        _sessionStore = State(initialValue: SessionStore(authorizationProvider: authorizationProvider))
    }

    var body: some Scene {
        WindowGroup {
            rootView
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
            .task { await sessionStore.restore() }
            .onOpenURL { _ = sessionStore.handleOpenURL($0) }
    }
}
