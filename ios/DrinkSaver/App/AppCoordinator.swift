import Observation

enum AppScreen: Equatable {
    case quick
    case history
    case recommendations
}

enum AddRoute: Equatable {
    case menu
    case option(AddRouteField)
    case create(AddCreatableField)
}

enum AddRouteField: Equatable {
    case alcoholType, volume, subtype, consumptionType, brand, flavour, date, notes, recommend
}

enum AddCreatableField: Equatable {
    case alcoholType, volume, subtype, brand, flavour
}

@MainActor
@Observable
final class AppCoordinator {
    var currentScreen: AppScreen = .quick
    var addPanels: [AddRoute] = []

    var isAddPresented: Bool { !addPanels.isEmpty }

    func navigate(to screen: AppScreen) { currentScreen = screen }

    func presentAdd(startingAt panel: AddRoute = .menu) { addPanels = [panel] }

    func push(_ panel: AddRoute) {
        guard isAddPresented else { return }
        addPanels.append(panel)
    }

    func popAddPanel() {
        guard addPanels.count > 1 else { return }
        addPanels.removeLast()
    }

    func dismissAdd() { addPanels = [] }

    func sessionDidSignOut() {
        currentScreen = .quick
        dismissAdd()
    }
}
