import Foundation
import Observation

enum HistoryDayState: Equatable { case loading, ready, failed }

struct HistoryRow: Identifiable, Equatable {
    let drink: EditableDrink
    var isSelected: Bool
    var exitingToken: Int?
    var id: Int { drink.id }
}

struct HistoryDayCount: Equatable {
    let state: HistoryDayState
    let count: Int
    var pipCount: Int { min(4, count) }
}

@MainActor
@Observable
final class HistoryStore {
    private(set) var selectedDate: String
    private(set) var days: [String: HistoryDayState] = [:]
    private(set) var serverRows: [String: [EditableDrink]] = [:]
    private(set) var selectedIDs = Set<Int>()
    private var exitingIDs: [String: Set<Int>] = [:]
    private var retainedRows: [String: [Int: EditableDrink]] = [:]
    private var exitTokens: [String: [Int: Int]] = [:]
    private var requests: [String: Int] = [:]
    private var nextToken = 0
    private let api: (any DrinkSaverAPI)?
    private let queue: SaveQueueStore
    private let drinkingDay: CurrentDrinkingDayStore
    private let session: SessionStore
    private let calendar: Calendar
    private var subject: String?

    init(api: (any DrinkSaverAPI)?, queue: SaveQueueStore, drinkingDay: CurrentDrinkingDayStore,
         session: SessionStore, calendar: Calendar = .autoupdatingCurrent) {
        self.api = api; self.queue = queue; self.drinkingDay = drinkingDay
        self.session = session; self.calendar = calendar; selectedDate = drinkingDay.date
    }

    var stripDates: [String] {
        Self.stripDates(endingAt: drinkingDay.date, calendar: calendar)
    }
    var queueState: SaveQueueState { queue.state }

    var visibleRows: [HistoryRow] {
        guard case .ready? = days[selectedDate], let raw = serverRows[selectedDate] else { return [] }
        let merged = mergedRows(raw, date: selectedDate)
        let live = Dictionary(uniqueKeysWithValues: merged.map { ($0.id, $0) })
        let exits = exitingIDs[selectedDate, default: []]
        let originals = raw.map { drink -> HistoryRow? in
            if exits.contains(drink.id) { return HistoryRow(drink: retainedRows[selectedDate]?[drink.id] ?? drink, isSelected: false, exitingToken: exitTokens[selectedDate]?[drink.id]) }
            guard let current = live[drink.id] else { return nil }
            return HistoryRow(drink: current, isSelected: selectedIDs.contains(drink.id), exitingToken: nil)
        }.compactMap { $0 }
        let originalIDs = Set(raw.map(\.id))
        return originals + merged.filter { !originalIDs.contains($0.id) }.map {
            HistoryRow(drink: $0, isSelected: selectedIDs.contains($0.id), exitingToken: nil)
        }
    }

    func dayCount(_ date: String) -> HistoryDayCount {
        let state = days[date] ?? .loading
        guard state == .ready else { return HistoryDayCount(state: state, count: 0) }
        let rows = mergedRows(serverRows[date] ?? [], date: date)
        let exited = exitingIDs[date, default: []]
        return HistoryDayCount(state: .ready, count: rows.filter { !exited.contains($0.id) }.count)
    }

    func loadStrip() async {
        guard session.userID != nil else { return }
        if subject != session.userID { serverRows.removeAll(); days.removeAll(); subject = session.userID }
        let dates = stripDates
        await withTaskGroup(of: Void.self) { group in
            for date in dates { group.addTask { await self.load(date: date) } }
        }
    }

    func select(date: String) async {
        guard let target = Self.parse(date, calendar: calendar),
              let today = Self.parse(drinkingDay.date, calendar: calendar), target <= today else { return }
        selectedDate = date
        selectedIDs.removeAll()
        if days[date] == nil || days[date] == .failed { await load(date: date) }
    }

    func select(date: Date) async { await select(date: Self.format(date, calendar: calendar)) }
    func retrySelected() async { days[selectedDate] = nil; await load(date: selectedDate) }

    func toggleSelection(id: Int) {
        guard !exitingIDs[selectedDate, default: []].contains(id) else { return }
        if !selectedIDs.insert(id).inserted { selectedIDs.remove(id) }
    }

    func crossOff(ids: [Int]? = nil, reduceMotion: Bool = false) {
        let ids = Array(Set(ids ?? Array(selectedIDs))).sorted()
        guard !ids.isEmpty else { return }
        let snapshot = Dictionary(uniqueKeysWithValues: visibleRows.filter { ids.contains($0.id) }.map { ($0.id, $0.drink) })
        guard !snapshot.isEmpty else { return }
        nextToken += 1
        let token = nextToken
        retainedRows[selectedDate, default: [:]].merge(snapshot) { _, new in new }
        exitingIDs[selectedDate, default: []].formUnion(snapshot.keys)
        for id in snapshot.keys { exitTokens[selectedDate, default: [:]][id] = token }
        selectedIDs.subtract(snapshot.keys)
        let label = snapshot.count == 1 ? snapshot.values.first?.name ?? "drink" : "\(snapshot.count) drinks"
        _ = queue.delete(DeleteOperation(label: label, date: selectedDate, drinkIDs: Array(snapshot.keys)))
        let date = selectedDate
        if reduceMotion {
            for id in snapshot.keys { finishExit(id: id, token: token, date: date) }
            return
        }
        Task { @MainActor [weak self] in
            try? await Task.sleep(for: .milliseconds(350))
            guard let self else { return }
            for id in snapshot.keys { self.finishExit(id: id, token: token, date: date) }
        }
    }

    func finishExit(id: Int, token: Int) {
        finishExit(id: id, token: token, date: selectedDate)
    }
    private func finishExit(id: Int, token: Int, date: String) {
        guard exitTokens[date]?[id] == token else { return }
        exitingIDs[date]?.remove(id)
        exitTokens[date]?[id] = nil
    }

    func queueDidChange() {
        for date in Array(retainedRows.keys) {
            let ids = Set(retainedRows[date, default: [:]].keys)
            let pending = queue.state.entries.filter { entry in
                guard case .delete(let op) = entry.kind, op.date == date else { return false }
                switch entry.status { case .undoable, .undoing: return true; case .saving, .failed, .committed: return false }
            }.reduce(into: Set<Int>()) { $0.formUnion($1.drinkIDs) }
            for id in ids where !pending.contains(id) {
                retainedRows[date]?[id] = nil; exitingIDs[date]?.remove(id); exitTokens[date]?[id] = nil
            }
            if retainedRows[date]?.isEmpty == true { retainedRows[date] = nil }
        }
        selectedIDs = Set(selectedIDs.filter { id in visibleRows.contains(where: { $0.id == id && $0.exitingToken == nil }) })
    }

    func sessionDidSignOut() {
        subject = nil; requests.removeAll(); serverRows.removeAll(); days.removeAll()
        selectedIDs.removeAll(); exitingIDs.removeAll(); retainedRows.removeAll(); exitTokens.removeAll()
        selectedDate = drinkingDay.date
    }

    static func format(_ date: Date, calendar: Calendar = .current) -> String {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.calendar = calendar
        formatter.timeZone = calendar.timeZone
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.string(from: date)
    }
    static func stripDates(endingAt date: String, calendar: Calendar = .current) -> [String] {
        guard let end = parse(date, calendar: calendar) else { return [] }
        return DrinkingDay.strip(endingAt: end, count: 7, calendar: calendar).map { format($0, calendar: calendar) }
    }
    static func parse(_ value: String, calendar: Calendar = .current) -> Date? {
        let parts = value.split(separator: "-").compactMap { Int($0) }
        guard parts.count == 3 else { return nil }
        return calendar.date(from: DateComponents(year: parts[0], month: parts[1], day: parts[2])).map(calendar.startOfDay(for:))
    }

    private func load(date: String) async {
        guard let userID = session.userID else { return }
        if days[date] == .ready { return }
        requests[date, default: 0] += 1
        let request = requests[date]!
        days[date] = .loading
        if date == drinkingDay.date {
            await drinkingDay.load()
            guard requests[date] == request, session.userID == userID else { return }
            switch drinkingDay.state {
            case .ready: serverRows[date] = drinkingDay.serverDrinks; days[date] = .ready
            case .failed: days[date] = .failed
            case .idle, .loading: days[date] = .loading
            }
            return
        }
        guard let api else { days[date] = .failed; return }
        do {
            let result = try await api.drinks(date: date)
            guard requests[date] == request, session.userID == userID else { return }
            serverRows[date] = result; days[date] = .ready
        } catch {
            guard requests[date] == request, session.userID == userID else { return }
            days[date] = .failed
        }
    }

    private func mergedRows(_ rows: [EditableDrink], date: String) -> [EditableDrink] {
        SaveQueueReducer.merge(rows, with: queue.state, date: date)
            .filter { !queue.suppressedDrinkIDs(for: date).contains($0.id) }
    }
}
