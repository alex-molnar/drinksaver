import XCTest
@testable import DrinkSaver

@MainActor
final class AddDrinkDateTests: XCTestCase {
    func testPreviousDayCrossesMonthBoundaryAndKeepsNoon() throws {
        let today = try XCTUnwrap(AddDrinkStore.date(forISODate: "2026-03-01"))
        let yesterday = AddDrinkStore.previousDay(of: today)
        XCTAssertEqual(AddDrinkStore.apiDate(yesterday), "2026-02-28")
    }

    func testWhenLabelIsTodayYesterdayOrDate() throws {
        let today = try XCTUnwrap(AddDrinkStore.date(forISODate: "2026-09-29"))
        XCTAssertEqual(AddDrinkStore.whenLabel(today, today: today), "Today")
        XCTAssertEqual(AddDrinkStore.whenLabel(AddDrinkStore.previousDay(of: today), today: today), "Yesterday")
        let older = try XCTUnwrap(AddDrinkStore.date(forISODate: "2026-09-20"))
        XCTAssertEqual(AddDrinkStore.whenLabel(older, today: today, locale: Locale(identifier: "en_US")), "Sunday 20 September")
        XCTAssertEqual(AddDrinkStore.whenLabel(nil, today: today), "Today")
    }

    func testSaveDateUsesYesterdayWhenChosenElseCurrentDay() throws {
        let today = try XCTUnwrap(AddDrinkStore.date(forISODate: "2026-03-01"))
        var draft = AddDrinkDraft()
        XCTAssertEqual(AddDrinkStore.saveDate(draft, currentDay: "2026-03-01"), "2026-03-01")
        draft.date = AddDrinkStore.previousDay(of: today)
        XCTAssertEqual(AddDrinkStore.saveDate(draft, currentDay: "2026-03-01"), "2026-02-28")
    }
}
