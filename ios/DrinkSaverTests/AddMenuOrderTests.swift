import XCTest
@testable import DrinkSaver

/// Row lists of web `menuFields` (web/src/drink/draftFields.ts).
@MainActor
final class AddMenuOrderTests: XCTestCase {
    func testWithoutADrinkOnlyDrinkAndWhenShow() {
        XCTAssertEqual(AddDrinkStore.menuRows(hasType: false, isBeer: false, hasBrand: false), [.alcoholType, .date])
        XCTAssertEqual(AddDrinkStore.menuRows(hasType: false, isBeer: true, hasBrand: true), [.alcoholType, .date])
    }

    func testBeerShowsBrandThenFlavourOnlyWithBrandThenServedThenSize() {
        XCTAssertEqual(AddDrinkStore.menuRows(hasType: true, isBeer: true, hasBrand: false),
                       [.alcoholType, .brand, .consumptionType, .volume, .date])
        XCTAssertEqual(AddDrinkStore.menuRows(hasType: true, isBeer: true, hasBrand: true),
                       [.alcoholType, .brand, .flavour, .consumptionType, .volume, .date])
    }

    func testNonBeerAlwaysShowsSubtypeThenSize() {
        XCTAssertEqual(AddDrinkStore.menuRows(hasType: true, isBeer: false, hasBrand: false),
                       [.alcoholType, .subtype, .volume, .date])
        XCTAssertEqual(AddDrinkStore.menuRows(hasType: true, isBeer: false, hasBrand: true),
                       [.alcoholType, .subtype, .volume, .date])
    }
}
