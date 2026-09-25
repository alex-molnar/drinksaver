import SwiftUI

struct RootView: View {
    @Environment(ThemeStore.self) private var themeStore
    @Environment(SessionStore.self) private var sessionStore
    @Environment(DesignCatalogueStore.self) private var designCatalogueStore
    @Environment(SaveQueueStore.self) private var saveQueueStore: SaveQueueStore?
    @Environment(CurrentDrinkingDayStore.self) private var currentDrinkingDayStore

    var body: some View {
        Group {
            switch sessionStore.state {
            case .restoring:
                ProgressView("Restoring your session…")
            case .authorizing:
                ProgressView("Signing in…")
            case .signedOut:
                sessionGate(title: "Welcome to DrinkSaver", button: "Sign in") {
                    await sessionStore.signIn()
                }
            case .signedIn:
                AppFrame()
            case .failed(let message):
                sessionGate(title: message, button: "Sign in") {
                    await sessionStore.signIn()
                }
            case .signOutFailed(let message):
                sessionGate(title: message, button: "Retry sign out") {
                    await sessionStore.signOut()
                }
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background { PlasterBackground(theme: themeStore.theme) }
        .preferredColorScheme(themeStore.mode == .dark ? .dark : .light)
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("app.root")
        .task(id: sessionStore.userID) {
            if sessionStore.userID == nil {
                designCatalogueStore.sessionDidSignOut()
                saveQueueStore?.sessionDidSignOut()
                currentDrinkingDayStore.sessionDidSignOut()
            } else {
                await designCatalogueStore.load()
                await currentDrinkingDayStore.load()
                await saveQueueStore?.reconcilePersistedDeletes()
            }
        }
    }

    private func sessionGate(title: String, button: String, action: @escaping () async -> Void) -> some View {
        VStack(spacing: 24) {
            Text(title)
                .font(themeStore.theme.type.displayM.font)
                .foregroundStyle(themeStore.theme.ink.primary.color)
                .multilineTextAlignment(.center)
            Button(button) { Task { await action() } }
                .buttonStyle(.borderedProminent)
        }
        .padding(32)
    }
}

#Preview {
    let sessionStore = SessionStore(authorizationProvider: nil)
    let queueStore = SaveQueueStore(api: nil, sessionStore: sessionStore, configuration: nil)
    RootView()
        .environment(ThemeStore())
        .environment(sessionStore)
        .environment(DesignCatalogueStore(api: nil, sessionStore: sessionStore))
        .environment(queueStore)
        .environment(CurrentDrinkingDayStore(api: nil, queueStore: queueStore, sessionStore: sessionStore))
        .environment(AppCoordinator())
}
