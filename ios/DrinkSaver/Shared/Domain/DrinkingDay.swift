import Foundation

enum DrinkingDay {
    private static let rolloverHour = 6

    static func date(for instant: Date, calendar: Calendar) -> Date {
        let day = calendar.startOfDay(for: instant)
        guard calendar.component(.hour, from: instant) < rolloverHour else { return day }
        return calendar.date(byAdding: .day, value: -1, to: day).map(calendar.startOfDay(for:)) ?? day
    }

    static func isoString(for instant: Date, calendar: Calendar) -> String {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.calendar = calendar
        formatter.timeZone = calendar.timeZone
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.string(from: date(for: instant, calendar: calendar))
    }

    static func strip(endingAt date: Date, count: Int, calendar: Calendar) -> [Date] {
        guard count > 0 else { return [] }
        let lastDay = calendar.startOfDay(for: date)
        return (0..<count).reversed().compactMap { offset in
            calendar.date(byAdding: .day, value: -offset, to: lastDay).map(calendar.startOfDay(for:))
        }
    }

    static func label(for date: Date, today: Date, locale: Locale, calendar: Calendar) -> String {
        let selectedDay = calendar.startOfDay(for: date)
        let todayDay = calendar.startOfDay(for: today)
        if selectedDay == todayDay { return "Today" }

        let yesterday = calendar.date(byAdding: .day, value: -1, to: todayDay).map(calendar.startOfDay(for:))
        if selectedDay == yesterday { return "Yesterday" }

        let formatter = DateFormatter()
        formatter.locale = locale
        formatter.calendar = calendar
        formatter.timeZone = calendar.timeZone
        formatter.dateFormat = "EEEE d MMMM"
        return formatter.string(from: selectedDay)
    }
}
