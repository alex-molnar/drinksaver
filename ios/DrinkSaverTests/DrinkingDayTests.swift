import Foundation
import XCTest
@testable import DrinkSaver

final class DrinkingDayTests: XCTestCase {
    func testSystemClockReturnsCurrentTime() {
        let before = Date()
        let now = SystemClock().now
        let after = Date()
        XCTAssertGreaterThanOrEqual(now, before)
        XCTAssertLessThanOrEqual(now, after)
    }

    func testRolloverIsAtSixLocalTime() throws {
        let calendar = try amsterdamCalendar()

        XCTAssertEqual(DrinkingDay.isoString(for: date(2026, 9, 10, 5, 59, calendar), calendar: calendar), "2026-09-09")
        XCTAssertEqual(DrinkingDay.isoString(for: date(2026, 9, 10, 6, 0, calendar), calendar: calendar), "2026-09-10")
    }

    func testRolloverHandlesMonthYearAndLeapDayBoundaries() throws {
        let calendar = try amsterdamCalendar()

        XCTAssertEqual(DrinkingDay.isoString(for: date(2026, 10, 1, 2, 0, calendar), calendar: calendar), "2026-09-30")
        XCTAssertEqual(DrinkingDay.isoString(for: date(2026, 1, 1, 3, 0, calendar), calendar: calendar), "2025-12-31")
        XCTAssertEqual(DrinkingDay.isoString(for: date(2028, 3, 1, 1, 0, calendar), calendar: calendar), "2028-02-29")
    }

    func testRolloverUsesWallClockAcrossAmsterdamDSTChanges() throws {
        let calendar = try amsterdamCalendar()

        XCTAssertEqual(DrinkingDay.isoString(for: date(2026, 3, 29, 5, 59, calendar), calendar: calendar), "2026-03-28")
        XCTAssertEqual(DrinkingDay.isoString(for: date(2026, 3, 29, 6, 0, calendar), calendar: calendar), "2026-03-29")
        XCTAssertEqual(DrinkingDay.isoString(for: date(2026, 10, 25, 5, 59, calendar), calendar: calendar), "2026-10-24")
        XCTAssertEqual(DrinkingDay.isoString(for: date(2026, 10, 25, 6, 0, calendar), calendar: calendar), "2026-10-25")
    }

    func testDateReturnsCalendarStartOfDrinkingDay() throws {
        let calendar = try amsterdamCalendar()
        let result = DrinkingDay.date(for: date(2026, 9, 10, 2, 0, calendar), calendar: calendar)

        XCTAssertEqual(components(result, calendar), DateComponents(year: 2026, month: 9, day: 9))
        XCTAssertEqual(calendar.component(.hour, from: result), 0)
    }

    func testStripReturnsSevenDatesOldestFirst() throws {
        let calendar = try amsterdamCalendar()
        let strip = DrinkingDay.strip(endingAt: date(2026, 9, 10, 12, 0, calendar), count: 7, calendar: calendar)

        XCTAssertEqual(strip.map { isoCalendarDate($0, calendar: calendar) }, [
            "2026-09-04", "2026-09-05", "2026-09-06", "2026-09-07", "2026-09-08", "2026-09-09", "2026-09-10",
        ])
    }

    func testStripHandlesCalendarRolloverAndNonpositiveCounts() throws {
        let calendar = try amsterdamCalendar()
        let end = date(2026, 10, 2, 12, 0, calendar)

        XCTAssertEqual(DrinkingDay.strip(endingAt: end, count: 3, calendar: calendar).map { isoCalendarDate($0, calendar: calendar) },
                       ["2026-09-30", "2026-10-01", "2026-10-02"])
        XCTAssertTrue(DrinkingDay.strip(endingAt: end, count: 0, calendar: calendar).isEmpty)
        XCTAssertTrue(DrinkingDay.strip(endingAt: end, count: -1, calendar: calendar).isEmpty)
    }

    func testLabelsAreEnglishAndRelativeToCalendarDays() throws {
        var calendar = try amsterdamCalendar()
        calendar.locale = Locale(identifier: "fr-FR")
        let enGB = Locale(identifier: "en-GB")
        let today = date(2026, 9, 10, 12, 0, calendar)

        XCTAssertEqual(DrinkingDay.label(for: date(2026, 9, 10, 0, 0, calendar), today: today, locale: enGB, calendar: calendar), "Today")
        XCTAssertEqual(DrinkingDay.label(for: date(2026, 9, 9, 12, 0, calendar), today: today, locale: enGB, calendar: calendar), "Yesterday")
        XCTAssertEqual(DrinkingDay.label(for: date(2026, 9, 4, 12, 0, calendar), today: today, locale: enGB, calendar: calendar), "Friday 4 September")
    }

    private func amsterdamCalendar() throws -> Calendar {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = try XCTUnwrap(TimeZone(identifier: "Europe/Amsterdam"))
        return calendar
    }

    private func date(_ year: Int, _ month: Int, _ day: Int, _ hour: Int, _ minute: Int, _ calendar: Calendar) -> Date {
        guard let date = calendar.date(from: DateComponents(year: year, month: month, day: day, hour: hour, minute: minute)) else {
            XCTFail("Invalid test date: \(year)-\(month)-\(day) \(hour):\(minute)")
            return Date(timeIntervalSince1970: 0)
        }
        return date
    }

    private func components(_ date: Date, _ calendar: Calendar) -> DateComponents {
        calendar.dateComponents([.year, .month, .day], from: date)
    }

    private func isoCalendarDate(_ date: Date, calendar: Calendar) -> String {
        let parts = components(date, calendar)
        guard let year = parts.year, let month = parts.month, let day = parts.day else {
            XCTFail("Calendar did not provide date components")
            return "invalid-date"
        }
        return String(format: "%04d-%02d-%02d", year, month, day)
    }
}
