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

    func testSignOutResetsNavigationAndDismissesAdd() {
        let coordinator = AppCoordinator()
        coordinator.navigate(to: .recommendations)
        coordinator.presentAdd(startingAt: .create(.alcoholType))

        coordinator.sessionDidSignOut()

        XCTAssertEqual(coordinator.currentScreen, .quick)
        XCTAssertFalse(coordinator.isAddPresented)
    }

    func testAddDrinkCascadesSelectionsAndResetsRecommendationFields() {
        var draft = AddDrinkDraft()
        let beer = AlcoholType(id: 4, userId: nil, name: "Beer", volumeIds: [6], colorPaletteId: 101, glasswareId: 201)
        draft.select(beer)
        draft.brand = Brand(id: 7, userId: nil, name: "House", colorPaletteId: nil)
        draft.flavour = BeerFlavour(id: 8, brandId: 7, userId: nil, name: "Pilsner", colorPaletteId: nil)
        draft.setRecommend(true)
        draft.onlyTemporarily = true
        draft.name = "House beer"
        draft.setRecommend(false)
        XCTAssertFalse(draft.onlyTemporarily)
        XCTAssertEqual(draft.name, "")
        draft.select(AlcoholType(id: 1, userId: nil, name: "Wine", volumeIds: [2], colorPaletteId: 101, glasswareId: 201))
        XCTAssertNil(draft.brand)
        XCTAssertNil(draft.flavour)
    }

    func testBeerDesignInheritsFromFlavourThenBrandThenType() {
        var draft = AddDrinkDraft()
        let beer = AlcoholType(id: 4, userId: nil, name: "Beer", volumeIds: [], colorPaletteId: 10, glasswareId: 20)
        draft.select(beer)
        let brand = Brand(id: 5, userId: nil, name: "House", colorPaletteId: 11)
        draft.select(brand)
        XCTAssertEqual(draft.colorPaletteId, 11)
        draft.select(BeerFlavour(id: 6, brandId: 5, userId: nil, name: "Pilsner", colorPaletteId: 12))
        XCTAssertEqual(draft.colorPaletteId, 12)
        draft.select(Brand(id: 7, userId: nil, name: "Other", colorPaletteId: nil))
        XCTAssertNil(draft.flavour)
        XCTAssertEqual(draft.colorPaletteId, 10)
    }

    func testAddDrinkRequestTrimsNotesOmitsDefaultsAndClampsQuantity() {
        var draft = AddDrinkDraft()
        draft.notes = "  tasting note  "
        draft.quantity = AddDrinkStore.clampedQuantity(28)
        let type = AlcoholType(id: 1, userId: nil, name: "Wine", volumeIds: [2], colorPaletteId: 101, glasswareId: 201)
        draft.alcoholType = type
        let volume = AlcoholVolume(id: 2, name: "Glass", volume: 0.2)
        let request = AddDrinkStore.makeRequest(type: type, volume: volume, draft: draft, date: "2026-09-25")
        XCTAssertEqual(request.comments, "tasting note")
        XCTAssertEqual(request.quantity, 24)
        XCTAssertNil(request.addToRecommendations)
        XCTAssertNil(request.onlyTemporarily)
        XCTAssertEqual(AddDrinkStore.provisionalLabel(draft), "Wine")
    }
}
