import SwiftUI

struct AppFrame: View {
    @Environment(ThemeStore.self) private var themeStore
    @Environment(SessionStore.self) private var sessionStore
    @Environment(CurrentDrinkingDayStore.self) private var drinkingDay
    @Environment(AppCoordinator.self) private var coordinator
    @Environment(AddDrinkStore.self) private var addDrinkStore
    @Environment(SaveQueueStore.self) private var saveQueueStore: SaveQueueStore?
    @State private var menuIsOpen = false

    private var theme: DrinkSaverTheme { themeStore.theme }
    private var header: AppFrameHeader {
        AppFrameHeader.make(
            screen: coordinator.currentScreen,
            isTonight: drinkingDay.isTonight,
            dayState: drinkingDay.state,
            drinkCount: drinkingDay.visibleCount
        )
    }
    private var addPresented: Binding<Bool> {
        Binding(get: { coordinator.isAddPresented }, set: { if !$0 { coordinator.dismissAdd() } })
    }

    var body: some View {
        ZStack(alignment: .top) {
            VStack(spacing: 0) {
                headerBar
                VStack(spacing: 0) {
                    if coordinator.currentScreen != .quick, let entry = saveQueueStore?.currentFeedback {
                        queueFeedback(entry)
                    }
                    content
                        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
                        .accessibilityIdentifier("frame.content.\(screenName)")
                }
                bottomNavigation
            }

            if menuIsOpen {
                Color.black.opacity(0.12)
                    .ignoresSafeArea()
                    .contentShape(Rectangle())
                    .onTapGesture { menuIsOpen = false }
                    .accessibilityHidden(true)
                menuCard
                    .frame(maxWidth: 260)
                    .frame(maxWidth: .infinity, alignment: .trailing)
                    .padding(.horizontal, 12)
                    .padding(.top, 64)
            }
        }
        .background { PlasterBackground(theme: theme) }
        .onChange(of: coordinator.isAddPresented) { _, presented in
            if presented { addDrinkStore.reset() }
        }
        .sheet(isPresented: addPresented, onDismiss: { coordinator.dismissAdd() }) {
            addSheet
                .presentationDetents([.medium, .large])
                .presentationDragIndicator(.visible)
                .presentationBackground(theme.surface.panel.color)
        }
    }

    private var headerBar: some View {
        HStack(alignment: .center, spacing: 10) {
            Text(header.title)
                .font(theme.type.displayL.font)
                .foregroundStyle(theme.ink.primary.color)
                .accessibilityIdentifier("frame.title")
            Spacer(minLength: 8)
            if let subtitle = header.subtitle {
                Text(subtitle)
                    .font(theme.type.caption.font)
                    .foregroundStyle(theme.ink.tertiary.color)
                    .accessibilityIdentifier("frame.subtitle")
            }
            Button {
                menuIsOpen.toggle()
            } label: {
                Image(systemName: "ellipsis")
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundStyle(theme.ink.primary.color)
                    .frame(width: 44, height: 44)
                    .background(theme.surface.raised.color, in: RoundedRectangle(cornerRadius: theme.radius.md))
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Menu")
            .accessibilityIdentifier("frame.menu")
        }
        .padding(.horizontal, 18)
        .padding(.top, 8)
        .padding(.bottom, 12)
        .background(theme.surface.raised.color)
        .overlay(alignment: .bottom) { Rectangle().fill(theme.line.hairline.color).frame(height: 1) }
    }

    @ViewBuilder
    private var content: some View {
        switch coordinator.currentScreen {
        case .quick:
            QuickSaveView()
        case .history:
            Color.clear.accessibilityLabel("History screen")
        case .recommendations:
            Color.clear.accessibilityLabel("Recommendations screen")
        }
    }

    private var bottomNavigation: some View {
        HStack(spacing: 0) {
            tab("Quick", icon: "bolt.fill", screen: .quick, id: "quick")
            Button { coordinator.presentAdd() } label: { tabLabel("Add", icon: "plus", selected: false) }
                .buttonStyle(.plain)
                .accessibilityIdentifier("frame.tab.add")
                .accessibilityValue("Opens Add")
            tab("History", icon: "clock", screen: .history, id: "history")
        }
        .padding(.horizontal, 12)
        .padding(.top, 8)
        .padding(.bottom, 4)
        .background(theme.surface.raised.color.ignoresSafeArea(edges: .bottom))
        .overlay(alignment: .top) { Rectangle().fill(theme.line.hairline.color).frame(height: 1) }
    }

    private func tab(_ title: String, icon: String, screen: AppScreen, id: String) -> some View {
        let selected = coordinator.currentScreen == screen
        return Button { coordinator.navigate(to: screen) } label: {
            tabLabel(title, icon: icon, selected: selected)
        }
        .buttonStyle(.plain)
        .accessibilityIdentifier("frame.tab.\(id)")
        .accessibilityValue(selected ? "Selected" : "Not selected")
    }

    private func tabLabel(_ title: String, icon: String, selected: Bool) -> some View {
        VStack(spacing: 3) {
            Capsule().fill(selected ? theme.accent.active.color : .clear).frame(width: 24, height: 2.5)
            Image(systemName: icon).font(.system(size: 19, weight: .medium)).frame(height: 22)
            Text(title).font(theme.type.caption.font)
        }
        .foregroundStyle(selected ? theme.ink.primary.color : theme.ink.tertiary.color)
        .frame(maxWidth: .infinity, minHeight: 44)
        .contentShape(Rectangle())
    }

    @ViewBuilder private func queueFeedback(_ entry: QueueEntry) -> some View {
        let title: String = switch entry.kind { case .save(let operation): operation.label; case .delete(let operation): operation.label }
        HStack(spacing: 12) {
            Text(feedbackMessage(entry, label: title)).font(theme.type.body.font).foregroundStyle(theme.ink.primary.color)
                .accessibilityIdentifier("frame.queue.message")
            Spacer(minLength: 4)
            switch entry.status {
            case .undoable: Button("Undo") { saveQueueStore?.undoCurrent() }.accessibilityIdentifier("frame.queue.undo")
            case .failed: Button("Retry") { saveQueueStore?.retryCurrent() }.accessibilityIdentifier("frame.queue.retry")
            case .undoing: ProgressView().accessibilityLabel("Undoing")
            case .saving, .committed: EmptyView()
            }
        }
        .buttonStyle(.bordered).padding(.horizontal, 16).padding(.vertical, 10)
        .background(theme.surface.panel.color)
        .overlay(alignment: .bottom) { Rectangle().fill(theme.line.hairline.color).frame(height: 1) }
    }
    private func feedbackMessage(_ entry: QueueEntry, label: String) -> String {
        switch entry.status { case .undoable: "Saved \(label)"; case .undoing: "Undoing \(label)…"; case .failed(let failure): failure.message; case .saving, .committed: "" }
    }

    private var menuCard: some View {
        VStack(spacing: 0) {
            menuAction("Recommendations") {
                coordinator.navigate(to: .recommendations)
                menuIsOpen = false
            }
            menuAction("Add new type") {
                menuIsOpen = false
                coordinator.presentAdd(startingAt: .create(.alcoholType))
            }
            Rectangle().fill(theme.line.hairline.color).frame(height: 1).padding(.vertical, 5)
            appearanceControl
                .padding(.horizontal, 12)
                .padding(.vertical, 7)
            Rectangle().fill(theme.line.hairline.color).frame(height: 1).padding(.vertical, 5)
            menuAction("Logout", destructive: true) {
                menuIsOpen = false
                Task { await sessionStore.signOut() }
            }
        }
        .padding(8)
        .background(theme.surface.panel.color, in: RoundedRectangle(cornerRadius: theme.radius.lg))
        .overlay(RoundedRectangle(cornerRadius: theme.radius.lg).stroke(theme.line.hairline.color, lineWidth: 1))
        .shadow(color: .black.opacity(0.22), radius: 18, y: 8)
    }

    private func menuAction(_ title: String, destructive: Bool = false, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack {
                Text(title).font(theme.type.body.font)
                Spacer()
            }
            .foregroundStyle(destructive ? theme.accent.danger.color : theme.ink.primary.color)
            .padding(.horizontal, 12)
            .frame(minHeight: 44)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }

    private var appearanceControl: some View {
        HStack(spacing: 12) {
            Image(systemName: "moon.fill").accessibilityHidden(true)
            Button { themeStore.toggle() } label: {
                Capsule().fill(theme.accent.active.color.opacity(0.28))
                    .frame(width: 46, height: 26)
                    .overlay(alignment: themeStore.mode == .dark ? .leading : .trailing) {
                        Circle().fill(theme.accent.active.color).frame(width: 20, height: 20).padding(3)
                    }
                    .frame(width: 48, height: 44)
                    .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Appearance")
            .accessibilityValue(themeStore.mode == .dark ? "Dark" : "Light")
            .accessibilityIdentifier("frame.theme.toggle")
            Image(systemName: "sun.max.fill").accessibilityHidden(true)
        }
        .font(.system(size: 14))
        .foregroundStyle(theme.ink.secondary.color)
        .frame(maxWidth: .infinity, minHeight: 44)
        .accessibilityElement(children: .contain)
    }

    private var addSheet: some View {
        VStack(spacing: 16) {
            HStack {
                if coordinator.addPanels.count > 1 {
                    Button {
                        if let route = coordinator.addPanels.last, case .create = route { addDrinkStore.cancelCreation() }
                        coordinator.popAddPanel()
                    } label: {
                        Image(systemName: "chevron.left").frame(width: 44, height: 44)
                    }
                    .accessibilityLabel("Back")
                    .accessibilityIdentifier("frame.add.back")
                }
                Spacer()
                Text(sheetTitle).font(theme.type.displayS.font).foregroundStyle(theme.ink.primary.color)
                Spacer()
                Button { coordinator.dismissAdd() } label: {
                    Image(systemName: "xmark").frame(width: 44, height: 44)
                }
                .accessibilityLabel("Close")
                .accessibilityIdentifier("frame.add.close")
            }
            .buttonStyle(.plain)
            .foregroundStyle(theme.ink.primary.color)
            .padding(.horizontal, 12)
            VStack(spacing: 0) { addPanel }
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
                .accessibilityElement(children: .contain)
                .accessibilityIdentifier("frame.add-sheet")
        }
        .padding(.top, 20)
        .background(theme.surface.panel.color)
    }

    @ViewBuilder private var addPanel: some View {
        switch coordinator.addPanels.last ?? .menu {
        case .menu:
            VStack(alignment: .leading, spacing: 0) {
                Text("What are you having?").font(theme.type.displayM.font).foregroundStyle(theme.ink.primary.color).padding(.horizontal, 20)
                Text("Drink and size are all it needs.").font(theme.type.caption.font).foregroundStyle(theme.ink.tertiary.color).padding(.horizontal, 20).padding(.top, 5).padding(.bottom, 8)
                ScrollView {
                    VStack(spacing: 0) {
                        addRow("Drink", value: addDrinkStore.draft.alcoholType?.name, field: .alcoholType)
                        addRow("Size", value: addDrinkStore.draft.volume.map { "\($0.name) (\($0.volume)L)" }, field: .volume)
                        if hasOptions(addDrinkStore.subtypes) || addDrinkStore.draft.subtype != nil { addRow("Kind", value: addDrinkStore.draft.subtype?.name, field: .subtype) }
                        if addDrinkStore.draft.isBeer {
                            addRow("Served", value: addDrinkStore.draft.consumptionType?.name, field: .consumptionType)
                            addRow("Brand", value: addDrinkStore.draft.brand?.name, field: .brand)
                            if addDrinkStore.draft.brand != nil { addRow("Flavour", value: addDrinkStore.draft.flavour?.name, field: .flavour) }
                        }
                        HStack {
                            Text("Date"); Spacer()
                            DatePicker("Date", selection: Binding(get: { addDrinkStore.draft.date ?? AddDrinkStore.date(forISODate: drinkingDay.date) ?? Date() }, set: { addDrinkStore.draft.date = $0 }), in: ...Date(), displayedComponents: .date)
                                .labelsHidden().accessibilityLabel("Date")
                        }.padding(.horizontal, 20).frame(minHeight: 48)
                        HStack {
                            Text("Notes"); Spacer()
                            TextField("Optional", text: Binding(get: { addDrinkStore.draft.notes }, set: { addDrinkStore.draft.notes = $0 }))
                                .multilineTextAlignment(.trailing).accessibilityLabel("Notes")
                        }.padding(.horizontal, 20).frame(minHeight: 48)
                        HStack {
                            Text("Quantity"); Spacer()
                            Button { addDrinkStore.setQuantity(addDrinkStore.draft.quantity - 1) } label: { Image(systemName: "minus.circle") }.accessibilityLabel("Decrease quantity")
                            Text("\(addDrinkStore.draft.quantity)").frame(minWidth: 32).accessibilityIdentifier("add.quantity")
                            Button { addDrinkStore.setQuantity(addDrinkStore.draft.quantity + 1) } label: { Image(systemName: "plus.circle") }.accessibilityLabel("Increase quantity")
                        }.padding(.horizontal, 20).frame(minHeight: 48)
                        Toggle("Add to recommendations", isOn: Binding(get: { addDrinkStore.draft.recommend }, set: { addDrinkStore.setRecommend($0) })).padding(.horizontal, 20).frame(minHeight: 48)
                        if addDrinkStore.draft.recommend {
                            Toggle("Temporary recommendation", isOn: Binding(get: { addDrinkStore.draft.onlyTemporarily }, set: { addDrinkStore.draft.onlyTemporarily = $0 })).padding(.horizontal, 20)
                            TextField("Recommendation name", text: Binding(get: { addDrinkStore.draft.recommendationName }, set: { addDrinkStore.draft.recommendationName = $0 })).textFieldStyle(.roundedBorder).padding(.horizontal, 20)
                            if !addDrinkStore.catalogue.palettes.isEmpty {
                                Picker("Recommendation color", selection: Binding(get: { addDrinkStore.draft.recommendationColorPaletteId }, set: { addDrinkStore.setRecommendationDesign(colorPaletteId: $0, glasswareId: addDrinkStore.draft.recommendationGlasswareId) })) {
                                    Text("Inherited").tag(Int?.none)
                                    ForEach(addDrinkStore.catalogue.palettes) { palette in Text(palette.name).tag(Optional(palette.id)) }
                                }.padding(.horizontal, 20)
                            }
                            if !addDrinkStore.catalogue.glassware.isEmpty {
                                Picker("Recommendation glass", selection: Binding(get: { addDrinkStore.draft.recommendationGlasswareId }, set: { addDrinkStore.setRecommendationDesign(colorPaletteId: addDrinkStore.draft.recommendationColorPaletteId, glasswareId: $0) })) {
                                    Text("Inherited").tag(Int?.none)
                                    ForEach(addDrinkStore.catalogue.glassware) { glass in Text(glass.name).tag(Optional(glass.id)) }
                                }.padding(.horizontal, 20)
                            }
                        }
                    }
                }
                if let error = addDrinkStore.errorMessage { Text(error).foregroundStyle(theme.accent.danger.color).padding(.horizontal, 20) }
                Button(addDrinkStore.draft.quantity == 1 ? "Save drink" : "Save \(addDrinkStore.draft.quantity) drinks") { addDrinkStore.save() }
                    .buttonStyle(.borderedProminent).frame(maxWidth: .infinity).padding()
                    .disabled(addDrinkStore.draft.alcoholType == nil || addDrinkStore.draft.volume == nil || (addDrinkStore.draft.isBeer && addDrinkStore.draft.consumptionType == nil) || addDrinkStore.isSaving)
                    .accessibilityIdentifier("add.save")
            }
        case .option(let field): optionPanel(field)
        case .create(let field): createPanel(field)
        }
    }

    private func addRow(_ title: String, value: String?, field: AddRouteField) -> some View {
        Button {
            coordinator.push(.option(field))
            Task {
                switch field {
                case .alcoholType: await addDrinkStore.loadAlcoholTypes()
                case .volume: await addDrinkStore.loadVolumes()
                case .subtype: await addDrinkStore.loadSubtypes()
                case .consumptionType: await addDrinkStore.loadConsumptionTypes()
                case .brand: await addDrinkStore.loadBrands()
                case .flavour: await addDrinkStore.loadFlavours()
                case .date, .notes, .recommend: break
                }
            }
        } label: {
            HStack { Text(title).font(theme.type.displayS.font); Spacer(minLength: 18).overlay(alignment: .trailing) { Rectangle().stroke(style: StrokeStyle(lineWidth: 1, dash: [2, 4])).foregroundStyle(theme.line.hairline.color).frame(height: 1) }; Text(value ?? "Choose").font(theme.type.body.font).foregroundStyle(value == nil ? theme.ink.tertiary.color : theme.accent.active.color) }
                .padding(.horizontal, 20).frame(minHeight: 48).contentShape(Rectangle())
        }.buttonStyle(.plain).accessibilityLabel("\(title), \(value ?? "Choose")")
    }

    @ViewBuilder private func optionPanel(_ field: AddRouteField) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(optionTitle(field)).font(theme.type.displayM.font).padding(.horizontal, 20)
            if case .loading = state(for: field) { ProgressView("Loading…").padding() }
            else if case .failed = state(for: field) { Text("Couldn’t load. Close and try again.").padding() }
            else {
                ScrollView { VStack(spacing: 0) {
                    ForEach(optionValues(field), id: \.id) { item in
                        Button(item.name) { select(item.id, field: field); coordinator.popAddPanel() }
                            .frame(maxWidth: .infinity, minHeight: 48, alignment: .leading).padding(.horizontal, 20).buttonStyle(.plain)
                    }
                    if let creatable = creatable(field) {
                        Button("＋ Add new \(fieldName(field))") { coordinator.push(.create(creatable)) }
                            .frame(maxWidth: .infinity, minHeight: 48, alignment: .leading).padding(.horizontal, 20)
                    }
                } }
            }
        }
    }

    private struct AddOption: Identifiable, Equatable { let id: Int; let name: String }
    private func optionValues(_ field: AddRouteField) -> [AddOption] {
        switch field {
        case .alcoholType: if case .loaded(let values) = addDrinkStore.alcoholTypes { values.map { AddOption(id:$0.id,name:$0.name) } } else { [] }
        case .volume: if case .loaded(let values) = addDrinkStore.volumes { values.map { AddOption(id:$0.id,name:"\($0.name) (\($0.volume)L)") } } else { [] }
        case .subtype: if case .loaded(let values) = addDrinkStore.subtypes { values.map { AddOption(id:$0.id,name:$0.name) } } else { [] }
        case .consumptionType: if case .loaded(let values) = addDrinkStore.consumptionTypes { values.map { AddOption(id:$0.id,name:$0.name) } } else { [] }
        case .brand: if case .loaded(let values) = addDrinkStore.brands { values.map { AddOption(id:$0.id,name:$0.name) } } else { [] }
        case .flavour: if case .loaded(let values) = addDrinkStore.flavours { values.map { AddOption(id:$0.id,name:$0.name) } } else { [] }
        case .date, .notes, .recommend: []
        }
    }
    private func state(for field: AddRouteField) -> AddDrinkStore.LoadState<[AddOption]> {
        switch field {
        case .alcoholType: mapState(addDrinkStore.alcoholTypes, transform: { $0.map { AddOption(id:$0.id,name:$0.name) } })
        case .volume: mapState(addDrinkStore.volumes, transform: { $0.map { AddOption(id:$0.id,name:$0.name) } })
        case .subtype: mapState(addDrinkStore.subtypes, transform: { $0.map { AddOption(id:$0.id,name:$0.name) } })
        case .consumptionType: mapState(addDrinkStore.consumptionTypes, transform: { $0.map { AddOption(id:$0.id,name:$0.name) } })
        case .brand: mapState(addDrinkStore.brands, transform: { $0.map { AddOption(id:$0.id,name:$0.name) } })
        case .flavour: mapState(addDrinkStore.flavours, transform: { $0.map { AddOption(id:$0.id,name:$0.name) } })
        default: .idle
        }
    }
    private func mapState<T: Equatable>(_ state: AddDrinkStore.LoadState<T>, transform: (T) -> [AddOption]) -> AddDrinkStore.LoadState<[AddOption]> {
        switch state { case .idle: .idle; case .loading: .loading; case .failed: .failed; case .loaded(let value): .loaded(transform(value)) }
    }
    private func hasOptions<T: Equatable>(_ value: AddDrinkStore.LoadState<[T]>) -> Bool { if case .loaded(let items) = value { !items.isEmpty } else { false } }
    private func creatable(_ field: AddRouteField) -> AddCreatableField? {
        switch field { case .alcoholType: .alcoholType; case .volume: .volume; case .subtype: .subtype; case .brand: .brand; case .flavour: .flavour; default: nil }
    }
    private func select(_ id: Int, field: AddRouteField) {
        switch field {
        case .alcoholType: if case .loaded(let items) = addDrinkStore.alcoholTypes, let item = items.first(where:{$0.id == id}) { addDrinkStore.selectAlcoholType(item) }
        case .volume: if case .loaded(let items) = addDrinkStore.volumes { addDrinkStore.selectVolume(items.first(where:{$0.id == id})) }
        case .subtype: if case .loaded(let items) = addDrinkStore.subtypes { addDrinkStore.selectSubtype(items.first(where:{$0.id == id})) }
        case .consumptionType: if case .loaded(let items) = addDrinkStore.consumptionTypes { addDrinkStore.selectConsumptionType(items.first(where:{$0.id == id})) }
        case .brand: if case .loaded(let items) = addDrinkStore.brands, let item = items.first(where:{$0.id == id}) { addDrinkStore.selectBrand(item) }
        case .flavour: if case .loaded(let items) = addDrinkStore.flavours, let item = items.first(where:{$0.id == id}) { addDrinkStore.selectFlavour(item) }
        default: break
        }
    }
    private func optionTitle(_ field: AddRouteField) -> String {
        switch field { case .alcoholType: "What are you drinking?"; case .volume: "What size?"; case .subtype: "Which kind?"; case .consumptionType: "How is it served?"; case .brand: "Which brand?"; case .flavour: "Which flavour?"; case .date: "Date"; case .notes: "Notes"; case .recommend: "Recommendations" }
    }
    private func fieldName(_ field: AddRouteField) -> String { optionTitle(field).lowercased().replacingOccurrences(of: "which ", with: "") }
    private func createPanel(_ field: AddCreatableField) -> some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("New \(field == .alcoholType ? "alcohol type" : String(describing: field))").font(theme.type.displayM.font).padding(.horizontal, 20)
                .accessibilityIdentifier(field == .alcoholType ? "frame.add.create.alcoholType" : "add.create.title")
            TextField("Name", text: Binding(get: { addDrinkStore.draft.creationName }, set: { addDrinkStore.draft.creationName = $0 }))
                .textFieldStyle(.roundedBorder).padding(.horizontal, 20).disabled(addDrinkStore.isCreating).accessibilityIdentifier("add.create.name")
            if field == .volume {
                TextField("Litres", text: Binding(get: { addDrinkStore.draft.volumeLitres }, set: { addDrinkStore.draft.volumeLitres = $0 }))
                    .keyboardType(.decimalPad).textFieldStyle(.roundedBorder).padding(.horizontal, 20).accessibilityLabel("Litres")
            }
            if field != .volume, field != .flavour {
                let palettes = addDrinkStore.catalogue.palettes
                if !palettes.isEmpty {
                    Picker("Color", selection: Binding(get: { addDrinkStore.draft.newEntryColorPaletteId }, set: { addDrinkStore.draft.newEntryColorPaletteId = $0 })) {
                        Text("Inherited").tag(Int?.none)
                        ForEach(palettes) { palette in Text(palette.name).tag(Optional(palette.id)) }
                    }.padding(.horizontal, 20)
                }
                if field != .brand {
                    let glasses = addDrinkStore.catalogue.glassware
                    if !glasses.isEmpty {
                        Picker("Glass", selection: Binding(get: { addDrinkStore.draft.newEntryGlasswareId }, set: { addDrinkStore.draft.newEntryGlasswareId = $0 })) {
                            Text("Inherited").tag(Int?.none)
                            ForEach(glasses) { glass in Text(glass.name).tag(Optional(glass.id)) }
                        }.padding(.horizontal, 20)
                    }
                }
            }
            Button(addDrinkStore.isCreating ? "Adding…" : "Add and use it") { Task { await addDrinkStore.create(field, name: addDrinkStore.draft.creationName, litres: field == .volume ? Double(addDrinkStore.draft.volumeLitres) : nil) } }
                .buttonStyle(.borderedProminent).padding(.horizontal, 20).disabled(addDrinkStore.isCreating).accessibilityIdentifier("add.create.submit")
            if let error = addDrinkStore.errorMessage { Text(error).foregroundStyle(theme.accent.danger.color).padding(.horizontal, 20) }
        }
    }

    private var sheetTitle: String {
        guard let route = coordinator.addPanels.last else { return "Add" }
        return switch route {
        case .menu: "Add a drink"
        case .option(let field): String(describing: field).capitalized
        case .create: "New type"
        }
    }

    private var screenName: String {
        switch coordinator.currentScreen {
        case .quick: "quick"
        case .history: "history"
        case .recommendations: "recommendations"
        }
    }
}
