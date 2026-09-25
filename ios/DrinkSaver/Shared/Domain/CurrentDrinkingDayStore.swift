import Foundation
import Observation

@MainActor
@Observable
final class CurrentDrinkingDayStore {
    enum State: Equatable {
        case idle
        case loading
        case ready
        case failed
    }

    private(set) var date: String
    private(set) var serverDrinks: [EditableDrink] = []
    private(set) var state: State = .idle

    var visibleCount: Int {
        let suppressed = queueStore.suppressedDrinkIDs(for: date)
        var ids = Set(serverDrinks.lazy.map(\.id).filter { !suppressed.contains($0) })
        ids.formUnion(queueStore.pendingInsertions(for: date).lazy.map(\.id).filter { !suppressed.contains($0) })
        return ids.count
    }

    private let api: (any DrinkQueueAPI)?
    private let queueStore: SaveQueueStore
    private let sessionStore: SessionStore
    private let clock: any Clock
    private var calendar: Calendar
    private var generation = 0
    private var loadedSubject: String?

    private(set) var isTonight: Bool
    var secondsUntilNextClockUpdate: TimeInterval {
        max(1, nextClockUpdate.timeIntervalSince(clock.now))
    }

    init(
        api: (any DrinkQueueAPI)?,
        queueStore: SaveQueueStore,
        sessionStore: SessionStore,
        clock: any Clock = SystemClock(),
        calendar: Calendar = .autoupdatingCurrent
    ) {
        self.api = api
        self.queueStore = queueStore
        self.sessionStore = sessionStore
        self.clock = clock
        self.calendar = calendar
        isTonight = calendar.component(.hour, from: clock.now) < 6
        date = DrinkingDay.isoString(for: clock.now, calendar: calendar)
    }

    func load() async {
        guard let subject = sessionStore.userID else {
            sessionDidSignOut()
            return
        }
        if loadedSubject != subject {
            serverDrinks = []
            loadedSubject = nil
        }
        guard let api else {
            serverDrinks = []
            state = .failed
            return
        }

        generation += 1
        let requestGeneration = generation
        let requestedDate = date
        state = .loading
        do {
            let rows = try await api.drinks(date: requestedDate)
            guard generation == requestGeneration, sessionStore.userID == subject, date == requestedDate else { return }
            serverDrinks = rows
            loadedSubject = subject
            _ = queueStore.merge(rows, for: requestedDate)
            state = .ready
        } catch {
            guard generation == requestGeneration, sessionStore.userID == subject, date == requestedDate else { return }
            state = .failed
        }
    }

    func refreshClockState() async {
        let now = clock.now
        isTonight = calendar.component(.hour, from: now) < 6
        let newDate = DrinkingDay.isoString(for: now, calendar: calendar)
        guard newDate != date else { return }
        generation += 1
        date = newDate
        serverDrinks = []
        state = .idle
        await load()
    }

    private var nextClockUpdate: Date {
        calendar.nextDate(
            after: clock.now,
            matching: DateComponents(hour: isTonight ? 6 : 0),
            matchingPolicy: .nextTime,
            repeatedTimePolicy: .first,
            direction: .forward
        )!
    }

    func sessionDidSignOut() {
        generation += 1
        serverDrinks = []
        loadedSubject = nil
        state = .idle
    }
}
