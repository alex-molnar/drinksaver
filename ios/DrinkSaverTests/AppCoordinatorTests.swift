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
        draft.recommendationName = "House beer"
        draft.setRecommend(false)
        XCTAssertFalse(draft.onlyTemporarily)
        XCTAssertEqual(draft.recommendationName, "")
        draft.creationName = "New subtype"
        draft.recommendationName = "House beer"
        draft.setRecommend(true)
        XCTAssertEqual(draft.creationName, "New subtype")
        XCTAssertEqual(draft.recommendationName, "House beer")
        draft.select(AlcoholType(id: 1, userId: nil, name: "Wine", volumeIds: [2], colorPaletteId: 101, glasswareId: 201))
        XCTAssertNil(draft.brand)
        XCTAssertNil(draft.flavour)
    }

    func testSelectingDesignSourcesDoesNotCreateCatalogueOverrides() {
        var draft = AddDrinkDraft()
        let beer = AlcoholType(id: 4, userId: nil, name: "Beer", volumeIds: [], colorPaletteId: 10, glasswareId: 20)
        draft.select(beer)
        let brand = Brand(id: 5, userId: nil, name: "House", colorPaletteId: 11)
        draft.select(brand)
        draft.select(BeerFlavour(id: 6, brandId: 5, userId: nil, name: "Pilsner", colorPaletteId: 12))
        draft.select(Brand(id: 7, userId: nil, name: "Other", colorPaletteId: nil))
        XCTAssertNil(draft.flavour)
        XCTAssertNil(draft.newEntryColorPaletteId)
        XCTAssertNil(draft.newEntryGlasswareId)
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

        draft.recommend = true
        draft.creationName = "Custom wine type"
        XCTAssertNil(AddDrinkStore.makeRequest(type: type, volume: volume, draft: draft, date: "2026-09-25").name)
        draft.recommendationName = "Recommendation label"
        XCTAssertEqual(AddDrinkStore.makeRequest(type: type, volume: volume, draft: draft, date: "2026-09-25").name, "Recommendation label")
    }

    func testAddDrinkRequestUsesSubtypeAndServingDesignBeforeIndependentRecommendationOverrides() {
        let wine = AlcoholType(id: 1, userId: nil, name: "Wine", volumeIds: [2], colorPaletteId: 10, glasswareId: 20)
        let subtype = AlcoholSubtype(id: 3, alcoholTypeId: 1, userId: nil, name: "Red", colorPaletteId: 11, glasswareId: 21)
        let volume = AlcoholVolume(id: 2, name: "Glass", volume: 0.2)
        var wineDraft = AddDrinkDraft()
        wineDraft.alcoholType = wine
        wineDraft.subtype = subtype
        XCTAssertEqual(AddDrinkStore.makeRequest(type: wine, volume: volume, draft: wineDraft, date: "2026-09-25").colorPaletteId, 11)
        XCTAssertEqual(AddDrinkStore.makeRequest(type: wine, volume: volume, draft: wineDraft, date: "2026-09-25").glasswareId, 21)

        let beer = AlcoholType(id: 4, userId: nil, name: "Beer", volumeIds: [2], colorPaletteId: 30, glasswareId: 40)
        var beerDraft = AddDrinkDraft()
        beerDraft.alcoholType = beer
        beerDraft.brand = Brand(id: 5, userId: nil, name: "House", colorPaletteId: 31)
        beerDraft.flavour = BeerFlavour(id: 6, brandId: 5, userId: nil, name: "Pilsner", colorPaletteId: 32)
        beerDraft.consumptionType = ConsumptionType(id: 7, name: "Draft", glasswareId: 42)
        beerDraft.recommend = true
        beerDraft.recommendationColorPaletteId = 33
        let beerRequest = AddDrinkStore.makeRequest(type: beer, volume: volume, draft: beerDraft, date: "2026-09-25")
        XCTAssertEqual(beerRequest.colorPaletteId, 33)
        XCTAssertEqual(beerRequest.glasswareId, 42)
        beerDraft.recommendationGlasswareId = 43
        XCTAssertEqual(AddDrinkStore.makeRequest(type: beer, volume: volume, draft: beerDraft, date: "2026-09-25").glasswareId, 43)
    }

    func testDrinkingDayISODateCanBeDisplayedAndSavedAsSameLocalDay() throws {
        let date = try XCTUnwrap(AddDrinkStore.date(forISODate: "2026-09-25"))
        XCTAssertEqual(AddDrinkStore.apiDate(date), "2026-09-25")
        XCTAssertNil(AddDrinkStore.date(forISODate: "not-a-date"))
    }
}
