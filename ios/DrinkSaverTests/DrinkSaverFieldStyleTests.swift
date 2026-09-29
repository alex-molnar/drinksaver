import XCTest
@testable import DrinkSaver

@MainActor
final class DrinkSaverFieldStyleTests: XCTestCase {
    private let options = [(id: 1, name: "Amber"), (id: 2, name: "Ruby")]

    func testChoiceLabelShowsSelectedNameOrEmptyLabel() {
        XCTAssertEqual(DesignChoiceLabel.title(selectedID: 2, options: options, emptyLabel: "Use inherited default"), "Ruby")
        XCTAssertEqual(DesignChoiceLabel.title(selectedID: nil, options: options, emptyLabel: "Choose a glass"), "Choose a glass")
        XCTAssertEqual(DesignChoiceLabel.title(selectedID: 9, options: options, emptyLabel: "Choose a glass"), "Choose a glass")
    }

    func testChoiceLabelSurvivesDuplicateIDs() {
        let dupes = [(id: 1, name: "First"), (id: 1, name: "Second")]
        XCTAssertEqual(DesignChoiceLabel.title(selectedID: 1, options: dupes, emptyLabel: "x"), "First")
    }

    func testEmptyLabelDependsOnInheritedDefault() {
        XCTAssertEqual(DesignChoiceLabel.emptyLabel(hasInherited: true, prompt: "Choose a glass"), "Use inherited default")
        XCTAssertEqual(DesignChoiceLabel.emptyLabel(hasInherited: false, prompt: "Choose a glass"), "Choose a glass")
    }

    func testUnavailableHelpMatchesWebCopy() {
        XCTAssertEqual(DesignChoiceLabel.unavailableHelp(glass: false), "Color palette choices are unavailable. Try again shortly.")
        XCTAssertEqual(DesignChoiceLabel.unavailableHelp(glass: true), "Glassware choices are unavailable. Try again shortly.")
    }

    func testCreateStaysDisabledWithoutADesignChoice() {
        var draft = AddDrinkDraft()
        draft.creationName = "Mead"
        XCTAssertFalse(draft.canCreate(.alcoholType), "nothing inherited and nothing choosable, as with an empty catalogue")
        draft.newEntryColorPaletteId = 1
        XCTAssertFalse(draft.canCreate(.alcoholType))
        draft.newEntryGlasswareId = 2
        XCTAssertTrue(draft.canCreate(.alcoholType))
    }

    func testQuantityLimitsMatchWeb() {
        var draft = AddDrinkDraft()
        XCTAssertFalse(draft.canDecrementQuantity)
        XCTAssertTrue(draft.canIncrementQuantity)
        draft.quantity = 24
        XCTAssertTrue(draft.canDecrementQuantity)
        XCTAssertFalse(draft.canIncrementQuantity)
    }

    func testInheritedDesignFollowsBeerAndNonBeerChains() {
        let wine = AlcoholType(id: 5, userId: nil, name: "Wine", volumeIds: [], colorPaletteId: 10, glasswareId: 20)
        let beer = AlcoholType(id: 4, userId: nil, name: "Beer", volumeIds: [], colorPaletteId: 11, glasswareId: 21)
        var draft = AddDrinkDraft()
        draft.select(wine)
        var ids = AddDrinkStore.inheritedDesignIDs(draft: draft, type: wine)
        XCTAssertEqual(ids.palette, 10); XCTAssertEqual(ids.glass, 20)
        draft.subtype = AlcoholSubtype(id: 1, alcoholTypeId: 5, userId: nil, name: "Merlot", colorPaletteId: 12, glasswareId: nil)
        ids = AddDrinkStore.inheritedDesignIDs(draft: draft, type: wine)
        XCTAssertEqual(ids.palette, 12); XCTAssertEqual(ids.glass, 20)
        draft.select(beer)
        draft.brand = Brand(id: 1, userId: nil, name: "B", colorPaletteId: 13)
        ids = AddDrinkStore.inheritedDesignIDs(draft: draft, type: beer)
        XCTAssertEqual(ids.palette, 13); XCTAssertNil(ids.glass, "beer glass only comes from the serving")
        draft.consumptionType = ConsumptionType(id: 2, name: "Draught", glasswareId: 30)
        XCTAssertEqual(AddDrinkStore.inheritedDesignIDs(draft: draft, type: beer).glass, 30)
    }

    func testCreationInheritanceForSubtypeBrandFlavour() {
        let wine = AlcoholType(id: 5, userId: nil, name: "Wine", volumeIds: [], colorPaletteId: 10, glasswareId: 20)
        var draft = AddDrinkDraft()
        draft.select(wine)
        XCTAssertEqual(draft.inheritedPaletteID(for: .subtype), 10)
        XCTAssertEqual(draft.inheritedGlasswareID(for: .subtype), 20)
        XCTAssertNil(draft.inheritedPaletteID(for: .brand), "brands only inherit from a beer type")
        XCTAssertNil(draft.inheritedPaletteID(for: .alcoholType))
    }
}
