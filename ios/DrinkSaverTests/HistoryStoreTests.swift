import XCTest
@testable import DrinkSaver

@MainActor
final class HistoryStoreTests: XCTestCase {
    func testSevenDayStripIsOldestFirstAndEndsOnCurrentDrinkingDate() {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(secondsFromGMT: 0)!
        XCTAssertEqual(HistoryStore.stripDates(endingAt: "2026-09-25", calendar: calendar), [
            "2026-09-19", "2026-09-20", "2026-09-21", "2026-09-22", "2026-09-23", "2026-09-24", "2026-09-25"
        ])
        XCTAssertTrue(HistoryStore.stripDates(endingAt: "bad-date", calendar: calendar).isEmpty)
        XCTAssertEqual(HistoryDayCount(state: .ready, count: 7).pipCount, 4)
    }
}
