import SwiftUI

struct RootView: View {
    @Environment(ThemeStore.self) private var themeStore

    var body: some View {
        Text("DrinkSaver")
            .font(themeStore.theme.type.displayL.font)
            .foregroundStyle(themeStore.theme.ink.primary.color)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background {
                PlasterBackground(theme: themeStore.theme)
            }
            .preferredColorScheme(themeStore.mode == .dark ? .dark : .light)
            .accessibilityIdentifier("app.root")
    }
}

#Preview {
    RootView()
}
