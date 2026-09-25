import SwiftUI

@main
@MainActor
struct DrinkSaverApp: App {
    @State private var themeStore = ThemeStore()
    @State private var sessionStore: SessionStore

    init() {
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
            RootView()
                .environment(themeStore)
                .environment(sessionStore)
                .task { await sessionStore.restore() }
                .onOpenURL { _ = sessionStore.handleOpenURL($0) }
        }
    }
}
