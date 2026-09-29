import XCTest
@testable import DrinkSaver

/// Mirrors web `isDraftReady` and CreatePanel `canSubmit`.
final class AddEnablementTests: XCTestCase {
    private let beer = AlcoholType(id: 4, userId: nil, name: "Beer", volumeIds: [6], colorPaletteId: nil, glasswareId: nil)
    private let wine = AlcoholType(id: 5, userId: nil, name: "Wine", volumeIds: [7], colorPaletteId: nil, glasswareId: nil)
    private let wineWithDesign = AlcoholType(id: 8, userId: nil, name: "Wine", volumeIds: [7], colorPaletteId: 5, glasswareId: 6)
    private let beerWithDesign = AlcoholType(id: 9, userId: nil, name: "Beer", volumeIds: [6], colorPaletteId: 5, glasswareId: 6)
    private let size = AlcoholVolume(id: 6, name: "Bottle", volume: 0.33)

    func testSaveNeedsTypeAndVolume() {
        var draft = AddDrinkDraft()
        XCTAssertFalse(draft.isReady)
        draft.select(wine)
        XCTAssertFalse(draft.isReady)
        draft.volume = size
        XCTAssertTrue(draft.isReady)
    }

    func testBeerAlsoNeedsConsumptionType() {
        var draft = AddDrinkDraft()
        draft.select(beer); draft.volume = size
        XCTAssertFalse(draft.isReady)
        draft.consumptionType = ConsumptionType(id: 1, name: "Draught", glasswareId: nil)
        XCTAssertTrue(draft.isReady)
    }

    func testCreateNeedsTrimmedNameAndPositiveLitresForVolume() {
        var draft = AddDrinkDraft()
        draft.select(wine)
        draft.creationName = "  Hop  "
        draft.volumeLitres = "0"
        XCTAssertFalse(draft.canCreate(.volume))
        draft.volumeLitres = "abc"
        XCTAssertFalse(draft.canCreate(.volume))
        draft.volumeLitres = "0.5"
        XCTAssertTrue(draft.canCreate(.volume))
        draft.creationName = "   "
        XCTAssertFalse(draft.canCreate(.volume))
    }

    func testNewTypeNeedsPaletteAndGlassBecauseNothingIsInherited() {
        var draft = AddDrinkDraft()
        draft.creationName = "Mead"
        XCTAssertFalse(draft.canCreate(.alcoholType))
        draft.newEntryColorPaletteId = 3
        XCTAssertFalse(draft.canCreate(.alcoholType))
        draft.newEntryGlasswareId = 2
        XCTAssertTrue(draft.canCreate(.alcoholType))
    }

    func testNonBeerBrandNeedsPaletteButBeerBrandInheritsFromType() {
        var draft = AddDrinkDraft()
        draft.creationName = "Pilsner Urquell"
        draft.select(wine)
        XCTAssertFalse(draft.canCreate(.brand))
        draft.newEntryColorPaletteId = 3
        XCTAssertTrue(draft.canCreate(.brand))
        draft.newEntryColorPaletteId = nil
        draft.select(beerWithDesign)
        XCTAssertTrue(draft.canCreate(.brand))
    }

    func testSubtypeNeedsParentTypeAndInheritsDesignFromIt() {
        var draft = AddDrinkDraft()
        draft.creationName = "Merlot"
        draft.newEntryColorPaletteId = 3; draft.newEntryGlasswareId = 2
        XCTAssertFalse(draft.canCreate(.subtype), "no parent type")
        draft.select(wine)
        XCTAssertTrue(draft.canCreate(.subtype))
        draft.newEntryColorPaletteId = nil; draft.newEntryGlasswareId = nil
        XCTAssertFalse(draft.canCreate(.subtype), "parent has no design to inherit")
        draft.select(wineWithDesign)
        XCTAssertTrue(draft.canCreate(.subtype))
    }

    func testVolumeNeedsParentTypeAndFlavourNeedsParentBrand() {
        var draft = AddDrinkDraft()
        draft.creationName = "Pint"; draft.volumeLitres = "0.5"
        XCTAssertFalse(draft.canCreate(.volume))
        draft.select(wine)
        XCTAssertTrue(draft.canCreate(.volume))
        draft.creationName = "Hazy"
        XCTAssertFalse(draft.canCreate(.flavour))
        draft.brand = Brand(id: 1, userId: nil, name: "Brew", colorPaletteId: nil)
        XCTAssertTrue(draft.canCreate(.flavour))
    }
}
