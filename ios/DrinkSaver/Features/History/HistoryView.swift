import SwiftUI

struct HistoryView: View {
    @Environment(HistoryStore.self) private var store
    @Environment(ThemeStore.self) private var themeStore
    @Environment(CurrentDrinkingDayStore.self) private var drinkingDay
    @Environment(\.locale) private var locale
    @State private var presentsCalendar = false
    @State private var calendarSelection = Date()

    private var theme: DrinkSaverTheme { themeStore.theme }
    private var selectedLabel: String {
        guard let date = HistoryStore.parse(store.selectedDate) else { return store.selectedDate }
        let today = HistoryStore.parse(drinkingDay.date) ?? Date()
        return DrinkingDay.label(for: date, today: today, locale: locale, calendar: .autoupdatingCurrent)
    }

    var body: some View {
        VStack(spacing: 0) {
            dayStrip
            paperTab
                .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
        .task { await store.loadStrip() }
        .onChange(of: store.selectedDate) { _, newValue in
            calendarSelection = HistoryStore.parse(newValue) ?? Date()
        }
        .onChange(of: store.queueState) { _, _ in store.queueDidChange() }
        .sheet(isPresented: $presentsCalendar) {
            VStack(spacing: 16) {
                Text("Choose a date").font(theme.type.displayM.font)
                DatePicker("Date", selection: $calendarSelection, in: ...Date(), displayedComponents: .date)
                    .datePickerStyle(.graphical).labelsHidden()
                Button("Show day") {
                    Task { await store.select(date: calendarSelection) }
                    presentsCalendar = false
                }.buttonStyle(.borderedProminent)
            }.padding().presentationDetents([.medium, .large]).presentationDragIndicator(.visible)
        }
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("history.screen")
    }

    private var dayStrip: some View {
        HStack(spacing: 8) {
            ScrollViewReader { proxy in
                ScrollView(.horizontal) {
                    HStack(spacing: 8) {
                        ForEach(store.stripDates, id: \.self) { date in dayTile(date) }
                    }
                    .padding(.horizontal, 12)
                }
                .scrollIndicators(.hidden)
                .onAppear { proxy.scrollTo(store.selectedDate, anchor: .trailing) }
                .onChange(of: store.selectedDate) { _, date in
                    withAnimation(.easeInOut(duration: 0.2)) { proxy.scrollTo(date, anchor: .trailing) }
                }
            }
            Button {
                calendarSelection = HistoryStore.parse(store.selectedDate) ?? Date()
                presentsCalendar = true
            } label: {
                Image(systemName: "calendar").frame(width: 44, height: 44)
                    .background(theme.surface.raised.color, in: RoundedRectangle(cornerRadius: theme.radius.sm))
            }
            .buttonStyle(.plain).accessibilityLabel("Choose date").accessibilityIdentifier("history.calendar")
            .padding(.trailing, 10)
        }
        .padding(.vertical, 8)
        .background(theme.surface.raised.color)
        .overlay(alignment: .bottom) { Rectangle().fill(theme.line.hairline.color).frame(height: 1) }
    }

    private func dayTile(_ date: String) -> some View {
        let selected = date == store.selectedDate
        let count = store.dayCount(date)
        let parsed = HistoryStore.parse(date) ?? Date()
        return Button { Task { await store.select(date: date) } } label: {
            VStack(spacing: 4) {
                Text(parsed.formatted(.dateTime.weekday(.abbreviated).locale(locale)))
                    .font(theme.type.caption.font)
                Text(parsed.formatted(.dateTime.day().locale(locale)))
                    .font(theme.type.displayS.font.monospacedDigit())
                HStack(spacing: 3) {
                    ForEach(0..<count.pipCount, id: \.self) { _ in Circle().fill(selected ? theme.ink.onAccent.color : theme.accent.active.color).frame(width: 4, height: 4) }
                    if count.state == .loading { Circle().stroke(theme.ink.tertiary.color, lineWidth: 1).frame(width: 4, height: 4) }
                    if count.state == .failed { Image(systemName: "exclamationmark").font(.system(size: 7, weight: .bold)) }
                }.frame(height: 5)
            }
            .foregroundStyle(selected ? theme.ink.onAccent.color : theme.ink.secondary.color)
            .frame(width: 48, height: 68)
            .background(selected ? theme.accent.primary.color : .clear, in: RoundedRectangle(cornerRadius: theme.radius.sm))
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel("\(parsed.formatted(.dateTime.weekday(.wide).month(.wide).day().locale(locale))), \(count.count) drinks")
        .accessibilityValue(selected ? "Selected" : "Not selected")
        .accessibilityIdentifier("history.day.\(date)")
    }

    private var paperTab: some View {
        VStack(spacing: 0) {
            HStack(alignment: .firstTextBaseline) {
                Text(selectedLabel).font(theme.type.displayM.font)
                Spacer()
                Text("\(store.dayCount(store.selectedDate).count) \(store.dayCount(store.selectedDate).count == 1 ? "drink" : "drinks")")
                    .font(theme.type.caption.font).accessibilityIdentifier("history.count")
            }
            .foregroundStyle(theme.ink.onPaper.color)
            .padding(.horizontal, 20).padding(.top, 22).padding(.bottom, 12)

            Group {
                switch store.dayCount(store.selectedDate).state {
                case .loading: ProgressView("Loading this day…").frame(maxWidth: .infinity, maxHeight: .infinity).accessibilityIdentifier("history.loading")
                case .failed:
                    VStack(spacing: 10) {
                        Text("Couldn’t load this day.").foregroundStyle(theme.accent.danger.color)
                        Button("Retry") { Task { await store.retrySelected() } }.accessibilityIdentifier("history.retry")
                    }.frame(maxWidth: .infinity, maxHeight: .infinity)
                case .ready where store.visibleRows.isEmpty:
                    Text("Nothing saved on this day.").font(theme.type.body.font).foregroundStyle(theme.ink.secondary.color)
                        .frame(maxWidth: .infinity, maxHeight: .infinity).accessibilityIdentifier("history.empty")
                case .ready:
                    List {
                        ForEach(store.visibleRows) { row in historyRow(row) }
                    }
                    .listStyle(.plain).scrollContentBackground(.hidden)
                    .accessibilityIdentifier("history.rows")
                }
            }

        }
        .padding(.horizontal, 8)
        .background(theme.surface.paper.color)
        .clipShape(RoundedRectangle(cornerRadius: theme.radius.md))
        .padding(.horizontal, 10).padding(.top, 10).padding(.bottom, 8)
    }

    private func historyRow(_ row: HistoryRow) -> some View {
        Text(row.drink.name).font(theme.type.body.font).foregroundStyle(theme.ink.onPaper.color)
            .frame(maxWidth: .infinity, alignment: .leading).fixedSize(horizontal: false, vertical: true)
        .listRowBackground(Color.clear)
        .listRowSeparatorTint(theme.ink.onPaper.color.opacity(0.12))
        .accessibilityIdentifier("history.row.\(row.id)")
        .transition(.opacity.combined(with: .move(edge: .trailing)))
        .animation(.easeInOut(duration: 0.25), value: row.exitingToken)
    }
}
