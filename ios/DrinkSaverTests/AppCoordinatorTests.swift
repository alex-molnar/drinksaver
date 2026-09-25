import XCTest
@testable import DrinkSaver

@MainActor
final class AppCoordinatorTests: XCTestCase {
    func testStartsOnQuickAndAddDismissalKeepsOriginatingTab() {
        let coordinator = AppCoordinator()
        XCTAssertEqual(coordinator.currentScreen, .quick)

        coordinator.navigate(to: .history)
        coordinator.presentAdd()
        XCTAssertEqual(coordinator.addPanels, [.menu])
        coordinator.dismissAdd()

        XCTAssertEqual(coordinator.currentScreen, .history)
        XCTAssertFalse(coordinator.isAddPresented)
    }

    func testAddPanelStackPushesAndPops() {
        let coordinator = AppCoordinator()
        coordinator.presentAdd()
        coordinator.push(.option(.alcoholType))
        coordinator.push(.create(.alcoholType))

        XCTAssertEqual(coordinator.addPanels, [.menu, .option(.alcoholType), .create(.alcoholType)])
        coordinator.popAddPanel()
        XCTAssertEqual(coordinator.addPanels, [.menu, .option(.alcoholType)])
    }

    func testAddCanStartAtCreateAlcoholType() {
        let coordinator = AppCoordinator()
        coordinator.presentAdd(startingAt: .create(.alcoholType))
        XCTAssertEqual(coordinator.addPanels, [.create(.alcoholType)])
    }
}
