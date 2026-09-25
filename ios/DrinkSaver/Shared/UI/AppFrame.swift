import SwiftUI

struct AppFrame: View {
    @Environment(ThemeStore.self) private var themeStore
    @Environment(SessionStore.self) private var sessionStore
    @Environment(CurrentDrinkingDayStore.self) private var drinkingDay
    @Environment(AppCoordinator.self) private var coordinator
    @State private var menuIsOpen = false

    private var theme: DrinkSaverTheme { themeStore.theme }
    private var header: AppFrameHeader {
        AppFrameHeader.make(
            screen: coordinator.currentScreen,
            isTonight: drinkingDay.isTonight,
            dayState: drinkingDay.state,
            drinkCount: drinkingDay.visibleCount
        )
    }
    private var addPresented: Binding<Bool> {
        Binding(get: { coordinator.isAddPresented }, set: { if !$0 { coordinator.dismissAdd() } })
    }

    var body: some View {
        ZStack(alignment: .top) {
            VStack(spacing: 0) {
                headerBar
                content
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
                    .accessibilityIdentifier("frame.content.\(screenName)")
                bottomNavigation
            }

            if menuIsOpen {
                Color.black.opacity(0.12)
                    .ignoresSafeArea()
                    .contentShape(Rectangle())
                    .onTapGesture { menuIsOpen = false }
                    .accessibilityHidden(true)
                menuCard
                    .frame(maxWidth: 260)
                    .frame(maxWidth: .infinity, alignment: .trailing)
                    .padding(.horizontal, 12)
                    .padding(.top, 64)
            }
        }
        .background { PlasterBackground(theme: theme) }
        .sheet(isPresented: addPresented, onDismiss: { coordinator.dismissAdd() }) {
            addSheet
                .presentationDetents([.medium, .large])
                .presentationDragIndicator(.visible)
                .presentationBackground(theme.surface.panel.color)
        }
    }

    private var headerBar: some View {
        HStack(alignment: .center, spacing: 10) {
            Text(header.title)
                .font(theme.type.displayL.font)
                .foregroundStyle(theme.ink.primary.color)
                .accessibilityIdentifier("frame.title")
            Spacer(minLength: 8)
            if let subtitle = header.subtitle {
                Text(subtitle)
                    .font(theme.type.caption.font)
                    .foregroundStyle(theme.ink.tertiary.color)
                    .accessibilityIdentifier("frame.subtitle")
            }
            Button {
                menuIsOpen.toggle()
            } label: {
                Image(systemName: "ellipsis")
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundStyle(theme.ink.primary.color)
                    .frame(width: 44, height: 44)
                    .background(theme.surface.raised.color, in: RoundedRectangle(cornerRadius: theme.radius.md))
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Menu")
            .accessibilityIdentifier("frame.menu")
        }
        .padding(.horizontal, 18)
        .padding(.top, 8)
        .padding(.bottom, 12)
        .background(theme.surface.raised.color)
        .overlay(alignment: .bottom) { Rectangle().fill(theme.line.hairline.color).frame(height: 1) }
    }

    @ViewBuilder
    private var content: some View {
        switch coordinator.currentScreen {
        case .quick:
            Color.clear.accessibilityLabel("Quick screen")
        case .history:
            Color.clear.accessibilityLabel("History screen")
        case .recommendations:
            Color.clear.accessibilityLabel("Recommendations screen")
        }
    }

    private var bottomNavigation: some View {
        HStack(spacing: 0) {
            tab("Quick", icon: "bolt.fill", screen: .quick, id: "quick")
            Button { coordinator.presentAdd() } label: { tabLabel("Add", icon: "plus", selected: false) }
                .buttonStyle(.plain)
                .accessibilityIdentifier("frame.tab.add")
                .accessibilityValue("Opens Add")
            tab("History", icon: "clock", screen: .history, id: "history")
        }
        .padding(.horizontal, 12)
        .padding(.top, 8)
        .padding(.bottom, 4)
        .background(theme.surface.raised.color.ignoresSafeArea(edges: .bottom))
        .overlay(alignment: .top) { Rectangle().fill(theme.line.hairline.color).frame(height: 1) }
    }

    private func tab(_ title: String, icon: String, screen: AppScreen, id: String) -> some View {
        let selected = coordinator.currentScreen == screen
        return Button { coordinator.navigate(to: screen) } label: {
            tabLabel(title, icon: icon, selected: selected)
        }
        .buttonStyle(.plain)
        .accessibilityIdentifier("frame.tab.\(id)")
        .accessibilityValue(selected ? "Selected" : "Not selected")
    }

    private func tabLabel(_ title: String, icon: String, selected: Bool) -> some View {
        VStack(spacing: 3) {
            Capsule().fill(selected ? theme.accent.active.color : .clear).frame(width: 24, height: 2.5)
            Image(systemName: icon).font(.system(size: 19, weight: .medium)).frame(height: 22)
            Text(title).font(theme.type.caption.font)
        }
        .foregroundStyle(selected ? theme.ink.primary.color : theme.ink.tertiary.color)
        .frame(maxWidth: .infinity, minHeight: 44)
        .contentShape(Rectangle())
    }

    private var menuCard: some View {
        VStack(spacing: 0) {
            menuAction("Recommendations") {
                coordinator.navigate(to: .recommendations)
                menuIsOpen = false
            }
            menuAction("Add new type") {
                menuIsOpen = false
                coordinator.presentAdd(startingAt: .create(.alcoholType))
            }
            Rectangle().fill(theme.line.hairline.color).frame(height: 1).padding(.vertical, 5)
            appearanceControl
                .padding(.horizontal, 12)
                .padding(.vertical, 7)
            Rectangle().fill(theme.line.hairline.color).frame(height: 1).padding(.vertical, 5)
            menuAction("Logout", destructive: true) {
                menuIsOpen = false
                Task { await sessionStore.signOut() }
            }
        }
        .padding(8)
        .background(theme.surface.panel.color, in: RoundedRectangle(cornerRadius: theme.radius.lg))
        .overlay(RoundedRectangle(cornerRadius: theme.radius.lg).stroke(theme.line.hairline.color, lineWidth: 1))
        .shadow(color: .black.opacity(0.22), radius: 18, y: 8)
    }

    private func menuAction(_ title: String, destructive: Bool = false, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack {
                Text(title).font(theme.type.body.font)
                Spacer()
            }
            .foregroundStyle(destructive ? theme.accent.danger.color : theme.ink.primary.color)
            .padding(.horizontal, 12)
            .frame(minHeight: 44)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }

    private var appearanceControl: some View {
        HStack(spacing: 12) {
            Image(systemName: "moon.fill").accessibilityHidden(true)
            Button { themeStore.toggle() } label: {
                Capsule().fill(theme.accent.active.color.opacity(0.28))
                    .frame(width: 46, height: 26)
                    .overlay(alignment: themeStore.mode == .dark ? .leading : .trailing) {
                        Circle().fill(theme.accent.active.color).frame(width: 20, height: 20).padding(3)
                    }
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Appearance")
            .accessibilityValue(themeStore.mode == .dark ? "Dark" : "Light")
            .accessibilityIdentifier("frame.theme.toggle")
            Image(systemName: "sun.max.fill").accessibilityHidden(true)
        }
        .font(.system(size: 14))
        .foregroundStyle(theme.ink.secondary.color)
        .frame(maxWidth: .infinity, minHeight: 44)
        .accessibilityElement(children: .contain)
    }

    private var addSheet: some View {
        VStack(spacing: 16) {
            HStack {
                if coordinator.addPanels.count > 1 {
                    Button { coordinator.popAddPanel() } label: {
                        Image(systemName: "chevron.left").frame(width: 44, height: 44)
                    }
                    .accessibilityLabel("Back")
                    .accessibilityIdentifier("frame.add.back")
                }
                Spacer()
                Text(sheetTitle).font(theme.type.displayS.font).foregroundStyle(theme.ink.primary.color)
                Spacer()
                Button { coordinator.dismissAdd() } label: {
                    Image(systemName: "xmark").frame(width: 44, height: 44)
                }
                .accessibilityLabel("Close")
                .accessibilityIdentifier("frame.add.close")
            }
            .buttonStyle(.plain)
            .foregroundStyle(theme.ink.primary.color)
            .padding(.horizontal, 12)
            Color.clear
                .accessibilityElement(children: .contain)
                .accessibilityIdentifier("frame.add-sheet")
            Spacer(minLength: 0)
        }
        .padding(.top, 20)
        .background(theme.surface.panel.color)
        .overlay(alignment: .top) {
            if case .create(.alcoholType) = coordinator.addPanels.last {
                Text("Add alcohol type")
                    .font(theme.type.body.font)
                    .foregroundStyle(theme.ink.secondary.color)
                    .padding(.top, 88)
                    .accessibilityIdentifier("frame.add.create.alcoholType")
            }
        }
    }

    private var sheetTitle: String {
        guard let route = coordinator.addPanels.last else { return "Add" }
        return switch route {
        case .menu: "Add a drink"
        case .option(let field): String(describing: field).capitalized
        case .create: "New type"
        }
    }

    private var screenName: String {
        switch coordinator.currentScreen {
        case .quick: "quick"
        case .history: "history"
        case .recommendations: "recommendations"
        }
    }
}
