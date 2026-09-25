import Foundation
import XCTest
@testable import DrinkSaver

final class APIModelTests: XCTestCase {
    private func fixture(_ name: String) throws -> Data {
        let url = try XCTUnwrap(Bundle(for: Self.self).url(forResource: name, withExtension: "json"))
        return try Data(contentsOf: url)
    }

    private func decode<T: Decodable>(_ type: T.Type, from name: String) throws -> T {
        try JSONDecoder().decode(type, from: fixture(name))
    }

    func testSaveRequestOmitsUnsetOptionalFieldsAndNeverSendsUserID() throws {
        let request = try decode(DrinkSaveRequest.self, from: "drink-save-request")
        let object = try XCTUnwrap(JSONSerialization.jsonObject(with: JSONEncoder().encode(request)) as? [String: Any])
        XCTAssertEqual(object["alcoholTypeId"] as? Int, 4)
        XCTAssertNil(object["userId"])
        XCTAssertNil(object["comments"])
        XCTAssertNil(object["quantity"])
    }

    func testCreationRequestsOmitUnsetOptionalFieldsAndUserIdentity() throws {
        for request in [
            try JSONEncoder().encode(NewAlcoholEntry(name: "Cider")),
            try JSONEncoder().encode(NewAlcoholSubtype(alcoholTypeId: 4, name: "Lager")),
            try JSONEncoder().encode(NewBeerBrand(name: "House brand")),
            try JSONEncoder().encode(NewBeerFlavour(name: "Stout"))
        ] {
            let object = try XCTUnwrap(JSONSerialization.jsonObject(with: request) as? [String: Any])
            XCTAssertFalse(object.keys.contains("userId"))
            XCTAssertFalse(object.keys.contains("colorPaletteId"))
            XCTAssertFalse(object.keys.contains("glasswareId"))
            XCTAssertFalse(object.keys.contains("volumes"))
            XCTAssertFalse(object.keys.contains("alcoholSubtypes"))
            XCTAssertFalse(object.keys.contains("flavours"))
        }
    }

    func testSavedDrinksAlwaysDecodeAsArrayAndRecommendationIDMayBeNull() throws {
        let saved = try decode([SavedDrink].self, from: "saved-drinks")
        XCTAssertEqual(saved.map(\.id), [101, 102])
        XCTAssertEqual(try decode([SavedDrink].self, from: "saved-drink").map(\.id), [101])
        let recommendations = try decode([Recommendation].self, from: "recommendations")
        XCTAssertEqual(recommendations.map(\.id), [nil, 9])
    }

    func testRecommendationEditsPreserveRequestOrder() throws {
        let edits = try decode([RecommendationEdit].self, from: "recommendation-edits")
        XCTAssertEqual(edits.map(\.id), [9, 3, 7])
        XCTAssertEqual(try JSONDecoder().decode([RecommendationEdit].self, from: JSONEncoder().encode(edits)), edits)
    }

    func testCatalogAndCreationFixturesDecodeIncludingNullableDesignIDs() throws {
        let catalog = try fixture("catalog")
        let object = try XCTUnwrap(JSONSerialization.jsonObject(with: catalog) as? [String: Any])
        let decoder = JSONDecoder()
        XCTAssertEqual(try decoder.decode([AlcoholType].self, from: JSONSerialization.data(withJSONObject: object["alcoholTypes"]!))[0].volumeIds, [1, 2])
        XCTAssertNil(try decoder.decode([AlcoholSubtype].self, from: JSONSerialization.data(withJSONObject: object["subtypes"]!))[0].colorPaletteId)
        XCTAssertNil(try decoder.decode([Brand].self, from: JSONSerialization.data(withJSONObject: object["brands"]!))[0].colorPaletteId)
        XCTAssertNil(try decoder.decode([BeerFlavour].self, from: JSONSerialization.data(withJSONObject: object["flavours"]!))[0].colorPaletteId)
        XCTAssertEqual(try decoder.decode([AlcoholVolume].self, from: JSONSerialization.data(withJSONObject: object["volumes"]!))[0].volume, 0.5)
        XCTAssertEqual(try decoder.decode([ConsumptionType].self, from: JSONSerialization.data(withJSONObject: object["consumptionTypes"]!))[0].glasswareId, 1)
        XCTAssertEqual(try decoder.decode([EditableDrink].self, from: JSONSerialization.data(withJSONObject: object["editableDrinks"]!))[0].name, "Pint")
        XCTAssertNil(try decoder.decode([Palette].self, from: JSONSerialization.data(withJSONObject: object["palettes"]!))[0].inkLight)
        XCTAssertNil(try decoder.decode([Glassware].self, from: JSONSerialization.data(withJSONObject: object["glassware"]!))[0].f)

        let creation = try fixture("creation-requests")
        let requests = try XCTUnwrap(JSONSerialization.jsonObject(with: creation) as? [String: Any])
        XCTAssertEqual(try decoder.decode(NewAlcoholEntry.self, from: JSONSerialization.data(withJSONObject: requests["alcoholType"]!)).volumes?.count, 1)
        XCTAssertEqual(try decoder.decode(NewAlcoholSubtype.self, from: JSONSerialization.data(withJSONObject: requests["subtype"]!)).alcoholTypeId, 4)
        XCTAssertEqual(try decoder.decode(NewBeerBrand.self, from: JSONSerialization.data(withJSONObject: requests["brand"]!)).flavours, ["Stout"])
        XCTAssertEqual(try decoder.decode(NewBeerFlavour.self, from: JSONSerialization.data(withJSONObject: requests["flavour"]!)).name, "Stout")
        XCTAssertEqual(try decoder.decode(NewVolumeEntry.self, from: JSONSerialization.data(withJSONObject: requests["volume"]!)).volume, 0.33)
    }

    func testMissingRequiredFieldFailsDecoding() throws {
        XCTAssertThrowsError(try JSONDecoder().decode(AlcoholType.self, from: Data(#"{"id":1,"name":"Beer"}"#.utf8)))
    }
}
