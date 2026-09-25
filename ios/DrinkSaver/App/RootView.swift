import SwiftUI

struct RootView: View {
    @Environment(ThemeStore.self) private var themeStore
    @Environment(SessionStore.self) private var sessionStore
#if UI_TESTING
    @Environment(\.uiFixtureIdentifier) private var uiFixtureIdentifier
#endif

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
                VStack(spacing: 24) {
                    Text("DrinkSaver")
                        .font(themeStore.theme.type.displayL.font)
                        .foregroundStyle(themeStore.theme.ink.primary.color)
#if UI_TESTING
                        .accessibilityIdentifier(uiFixtureIdentifier.map { "fixture.\($0)" } ?? "app.home.title")
#endif
                    Button("Sign out") { Task { await sessionStore.signOut() } }
                }
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
    RootView()
        .environment(ThemeStore())
        .environment(SessionStore(authorizationProvider: nil))
}
