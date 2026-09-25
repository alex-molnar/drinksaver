import SwiftUI

@main
@MainActor
struct DrinkSaverApp: App {
    @State private var themeStore = ThemeStore()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(themeStore)
        }
    }
}
