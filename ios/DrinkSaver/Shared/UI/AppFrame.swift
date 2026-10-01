import SwiftUI

/// The two soft edges of the web frame (`AppFrame.tsx`): an ink wash fading down from the header and
/// an upward ink fade above the nav. Opacities are the web's: header `linear-gradient(180deg, ink-primary 12%, transparent)`,
/// nav `box-shadow: 0 -6px 18px ink 18%`.
enum AppFrameEdges {
    static let headerInkOpacity = 0.12
    static let navShadowInkOpacity = 0.18
    static let headerFadeHeight: CGFloat = 16
    static let navFadeHeight: CGFloat = 18
}

struct AppFrame: View {
    @Environment(ThemeStore.self) private var themeStore
    @Environment(SessionStore.self) private var sessionStore
    @Environment(CurrentDrinkingDayStore.self) private var drinkingDay
    @Environment(AppCoordinator.self) private var coordinator
    @Environment(AddDrinkStore.self) private var addDrinkStore
    @Environment(DesignCatalogueStore.self) private var designs
    @State private var menuIsOpen = false
    @State private var showCustomDate = false
    @State private var customDate = Date()
    @State private var customDatePicked = false

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
                headerBar.zIndex(1)
                VStack(spacing: 0) {
                    content
                        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
                        .accessibilityIdentifier("frame.content.\(screenName)")
                        .safeAreaInset(edge: .bottom, spacing: 0) {
                            if !coordinator.isAddPresented {
                                FeedbackStrip(placement: coordinator.feedbackPlacement)
                            }
                        }
                }
                bottomNavigation.zIndex(1)
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
                // The catalogue loads once per session, so a failed load would otherwise never recover. Once per sheet appearance, for every panel.
                .task { if designs.state == .failed { await designs.retry() } }
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
        .background(theme.surface.raised.color.ignoresSafeArea(edges: .top))
        .overlay(alignment: .bottom) {
            // The web's ink wash, drawn below the header so no text sits on a gradient (the Apple contrast audit cannot judge one).
            LinearGradient(
                colors: [theme.ink.primary.color.opacity(AppFrameEdges.headerInkOpacity), .clear],
                startPoint: .top, endPoint: .bottom
            )
            .frame(height: AppFrameEdges.headerFadeHeight)
            .offset(y: AppFrameEdges.headerFadeHeight)
            .accessibilityHidden(true)
            .allowsHitTesting(false)
        }
        .overlay(alignment: .bottom) { Rectangle().fill(theme.line.hairline.color).frame(height: 1) }
    }

    @ViewBuilder
    private var content: some View {
        switch coordinator.currentScreen {
        case .quick:
            QuickSaveView()
        case .history:
            HistoryView()
        case .recommendations:
            RecommendationTabView()
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
        .overlay(alignment: .top) {
            // Web `box-shadow: 0 -6px 18px`, drawn as a fade above the nav so the labels keep a flat backing.
            LinearGradient(
                colors: [.clear, theme.ink.primary.color.opacity(AppFrameEdges.navShadowInkOpacity)],
                startPoint: .top, endPoint: .bottom
            )
            .frame(height: AppFrameEdges.navFadeHeight)
            .offset(y: -AppFrameEdges.navFadeHeight)
            .accessibilityHidden(true)
            .allowsHitTesting(false)
        }
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
                        Image(systemName: "chevron.left").frame(width: 44, height: 44).contentShape(Rectangle())
                    }
                    .accessibilityLabel("Back")
                    .accessibilityIdentifier("frame.add.back")
                }
                Spacer()
                Text(sheetTitle).font(theme.type.displayS.font).foregroundStyle(theme.ink.primary.color)
                Spacer()
                if case .option(let field) = coordinator.addPanels.last, let creatable = creatable(field) {
                    Button { coordinator.push(.create(creatable)) } label: {
                        Image(systemName: "plus").frame(width: 44, height: 44).contentShape(Rectangle())
                    }
                    .accessibilityLabel("Add \(fieldName(field))")
                    .accessibilityIdentifier("frame.add.new")
                } else {
                    Color.clear.frame(width: 44, height: 44).accessibilityHidden(true)
                }
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
        .safeAreaInset(edge: .bottom, spacing: 0) { FeedbackStrip(placement: .addSheet) }
    }

    @ViewBuilder private var addPanel: some View {
        switch coordinator.addPanels.last ?? .menu {
        case .menu:
            VStack(alignment: .leading, spacing: 0) {
                Text("What are you having?").font(theme.type.displayM.font).foregroundStyle(theme.ink.primary.color).padding(.horizontal, 20)
                Text("Drink and size are all it needs.").font(theme.type.caption.font).foregroundStyle(theme.ink.secondary.color).padding(.horizontal, 20).padding(.top, 5).padding(.bottom, 8)
                ScrollView {
                    VStack(spacing: 0) {
                        ForEach(AddDrinkStore.menuRows(hasType: addDrinkStore.draft.alcoholType != nil, isBeer: addDrinkStore.draft.isBeer, hasBrand: addDrinkStore.draft.brand != nil), id: \.self) { field in
                            addMenuRow(field)
                        }
                        // Label above the field: a side by side label and field overstretch and collide at large text sizes.
                        VStack(alignment: .leading, spacing: 6) {
                            Text("Notes")
                            TextField("Optional", text: Binding(get: { addDrinkStore.draft.notes }, set: { addDrinkStore.draft.notes = $0 }))
                                .drinkSaverField().accessibilityLabel("Notes")
                        }.padding(.horizontal, 20).padding(.vertical, 10)
                        HStack {
                            Text("Quantity").accessibilityHidden(true); Spacer()
                            HStack(spacing: 8) {
                                DrinkSaverStepperButton(systemImage: "minus", label: "Decrease quantity") { addDrinkStore.setQuantity(addDrinkStore.draft.quantity - 1) }
                                    .disabled(!addDrinkStore.draft.canDecrementQuantity)
                                Text("\(addDrinkStore.draft.quantity)")
                                    .font(.custom(theme.type.numeral.postScriptName, size: 24, relativeTo: .title2).monospacedDigit())
                                    .frame(minWidth: 44, minHeight: 44)
                                    .contentShape(Rectangle())
                                    // VoiceOver focuses this element and swipes up or down adjust it; the two buttons stay separate named elements.
                                    .accessibilityElement()
                                    .accessibilityLabel("Quantity")
                                    .accessibilityValue("\(addDrinkStore.draft.quantity)")
                                    .accessibilityAdjustableAction { direction in
                                        let q = addDrinkStore.draft.quantity
                                        addDrinkStore.setQuantity(direction == .increment ? q + 1 : q - 1)
                                    }
                                    .accessibilityIdentifier("add.quantity.value")
                                DrinkSaverStepperButton(systemImage: "plus", label: "Increase quantity") { addDrinkStore.setQuantity(addDrinkStore.draft.quantity + 1) }
                                    .disabled(!addDrinkStore.draft.canIncrementQuantity)
                            }
                        }.padding(.horizontal, 20).frame(minHeight: 48)
                        Toggle("Add to recommendations", isOn: Binding(get: { addDrinkStore.draft.recommend }, set: { addDrinkStore.setRecommend($0) })).padding(.horizontal, 20).frame(minHeight: 48)
                        if addDrinkStore.draft.recommend {
                            Toggle("Temporary recommendation", isOn: Binding(get: { addDrinkStore.draft.onlyTemporarily }, set: { addDrinkStore.draft.onlyTemporarily = $0 })).padding(.horizontal, 20)
                            TextField("Recommendation name", text: Binding(get: { addDrinkStore.draft.recommendationName }, set: { addDrinkStore.draft.recommendationName = $0 })).drinkSaverField().padding(.horizontal, 20).padding(.vertical, 6)
                            let inherited = AddDrinkStore.inheritedDesignIDs(draft: addDrinkStore.draft, type: addDrinkStore.draft.alcoholType)
                                designRow("Recommendation color palette", glass: false, selection: Binding(get: { addDrinkStore.draft.recommendationColorPaletteId }, set: { addDrinkStore.setRecommendationDesign(colorPaletteId: $0, glasswareId: addDrinkStore.draft.recommendationGlasswareId) }), paletteSelection: addDrinkStore.draft.recommendationColorPaletteId, inheritedPalette: inherited.palette, inheritedGlass: inherited.glass)
                                designRow("Recommendation glassware", glass: true, selection: Binding(get: { addDrinkStore.draft.recommendationGlasswareId }, set: { addDrinkStore.setRecommendationDesign(colorPaletteId: addDrinkStore.draft.recommendationColorPaletteId, glasswareId: $0) }), paletteSelection: addDrinkStore.draft.recommendationColorPaletteId, inheritedPalette: inherited.palette, inheritedGlass: inherited.glass)
                        }
                    }
                }
                if let error = addDrinkStore.errorMessage { Text(error).foregroundStyle(theme.accent.danger.color).padding(.horizontal, 20) }
                Button(addDrinkStore.draft.quantity == 1 ? "Save drink" : "Save \(addDrinkStore.draft.quantity) drinks") { addDrinkStore.save() }
                    .buttonStyle(.drinkSaver(size: .cta)).padding(.horizontal, 16).padding(.vertical, 8)
                    .disabled(!addDrinkStore.draft.isReady || addDrinkStore.isSaving)
                    .accessibilityIdentifier("add.save")
            }
        case .option(let field): optionPanel(field)
        case .create(let field): createPanel(field)
        }
    }

    @ViewBuilder private func addMenuRow(_ field: AddRouteField) -> some View {
        let draft = addDrinkStore.draft
        switch field {
        case .alcoholType: addRow("Drink", value: draft.alcoholType?.name, field: field)
        case .volume: addRow("Size", value: draft.volume.map(AddDrinkStore.volumeLabel), field: field)
        case .subtype: addRow("Subtype", value: draft.subtype?.name, field: field)
        case .consumptionType: addRow("Served", value: draft.consumptionType?.name, field: field)
        case .brand: addRow("Brand", value: draft.brand?.name, field: field)
        case .flavour: addRow("Flavour", value: draft.flavour?.name, field: field)
        case .date: addRow("When", value: AddDrinkStore.whenLabel(draft.date, today: todayDate), field: field)
        case .notes, .recommend: EmptyView()
        }
    }

    private var todayDate: Date { AddDrinkStore.date(forISODate: drinkingDay.date) ?? Date() }

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
            HStack { Text(title).font(theme.type.displayS.font); Spacer(minLength: 18).overlay(alignment: .trailing) { Rectangle().stroke(style: StrokeStyle(lineWidth: 1, dash: [2, 4])).foregroundStyle(theme.line.hairline.color).frame(height: 1) }; Text(value ?? "Choose").font(theme.type.body.font).foregroundStyle(value == nil ? theme.ink.secondary.color : theme.accent.active.color) }
                .padding(.horizontal, 20).frame(minHeight: 48).contentShape(Rectangle())
        }.buttonStyle(.plain).accessibilityLabel("\(title), \(value ?? "Choose")")
    }

    @ViewBuilder private func optionPanel(_ field: AddRouteField) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(optionTitle(field)).font(theme.type.displayM.font).padding(.horizontal, 20)
            if field == .date { datePanel }
            else if case .loading = state(for: field) { ProgressView("Loading…").padding() }
            else if case .failed = state(for: field) { Text("Couldn’t load. Go back and try again.").padding() }
            else {
                ScrollView { VStack(spacing: 0) {
                    ForEach(optionValues(field), id: \.id) { item in
                        Button { select(item.id, field: field); coordinator.popAddPanel() } label: {
                            HStack(spacing: 13) {
                                if item.showsSwatch { paletteSwatch(item.paletteID) }
                                Text(item.name)
                                Spacer(minLength: 0)
                            }
                            .frame(maxWidth: .infinity, minHeight: 48, alignment: .leading).contentShape(Rectangle())
                        }
                        .padding(.horizontal, 20).buttonStyle(.plain).accessibilityLabel(item.name)
                    }
                    if let creatable = creatable(field) {
                        Button("＋ Add new \(fieldName(field))") { coordinator.push(.create(creatable)) }
                            .buttonStyle(.drinkSaver(.secondary)).padding(.horizontal, 20).padding(.top, 8)
                    }
                } }
            }
        }
    }

    /// Web `DesignSelector`: the preview is `selected ?? inherited`, and the glass is tinted with the resolved palette.
    private func designRow(_ title: String, glass: Bool, selection: Binding<Int?>, paletteSelection: Int?, inheritedPalette: Int?, inheritedGlass: Int?) -> some View {
        let catalogue = addDrinkStore.catalogue
        let field = catalogue.palette(id: paletteSelection ?? inheritedPalette).field
        let hasInherited = (glass ? inheritedGlass : inheritedPalette) != nil
        let unavailable = glass ? catalogue.glassware.isEmpty : catalogue.palettes.isEmpty
        return DesignPickerRow(
            title: title,
            options: glass ? catalogue.glassware.map { ($0.id, $0.name) } : catalogue.palettes.map { ($0.id, $0.name) },
            selection: selection,
            emptyLabel: DesignChoiceLabel.emptyLabel(hasInherited: hasInherited, prompt: glass ? "Choose glassware" : "Choose a color palette"),
            hasInherited: hasInherited,
            unavailableHelp: unavailable ? DesignChoiceLabel.unavailableHelp(glass: glass) : nil,
            preview: glass ? .glass(catalogue.glass(id: selection.wrappedValue ?? inheritedGlass), chroma: field) : .palette(hex: field)
        ).padding(.horizontal, 20)
    }

    private func paletteSwatch(_ id: Int?) -> some View {
        Circle()
            .fill(Color(hexString: addDrinkStore.catalogue.palette(id: id).field, fallback: DesignCatalogue.fallbackPalette.field))
            .overlay(Circle().stroke(theme.ink.primary.color.opacity(0.32), lineWidth: 1))
            .frame(width: 14, height: 14)
            .accessibilityHidden(true)
    }

    @ViewBuilder private var datePanel: some View {
        let today = todayDate
        let selected = addDrinkStore.draft.date ?? today
        let yesterday = AddDrinkStore.previousDay(of: today)
        let cal = Calendar.current
        VStack(spacing: 0) {
            Color.clear.frame(height: 0).onAppear { showCustomDate = false }
            ForEach([("Today", today), ("Yesterday", yesterday)], id: \.0) { name, day in
                Button { addDrinkStore.draft.date = day; coordinator.popAddPanel() } label: {
                    Text(name).frame(maxWidth: .infinity, minHeight: 48, alignment: .leading).contentShape(Rectangle())
                }
                    .padding(.horizontal, 20).buttonStyle(.plain)
                    .accessibilityAddTraits(cal.isDate(selected, inSameDayAs: day) ? .isSelected : [])
                    .accessibilityIdentifier("add.date.\(name.lowercased())")
            }
            if showCustomDate {
                DatePicker("Choose a date", selection: $customDate, in: ...today, displayedComponents: .date)
                    .onChange(of: customDate) { _, _ in customDatePicked = true }
                    .padding(.horizontal, 20).accessibilityIdentifier("add.date.picker")
                Button("Set date") { addDrinkStore.draft.date = customDate; coordinator.popAddPanel() }
                    .buttonStyle(.drinkSaver()).disabled(!customDatePicked).padding(.horizontal, 20).padding(.vertical, 8).accessibilityIdentifier("add.date.set")
            } else {
                Button {
                    // Like web: seed only when the current date is neither Today nor Yesterday, and keep Set date disabled until a date is picked.
                    let isPreset = cal.isDate(selected, inSameDayAs: today) || cal.isDate(selected, inSameDayAs: yesterday)
                    customDate = isPreset ? today : selected
                    customDatePicked = !isPreset
                    showCustomDate = true
                } label: {
                    Text("Another day").frame(maxWidth: .infinity, minHeight: 48, alignment: .leading).contentShape(Rectangle())
                }
                    .padding(.horizontal, 20).buttonStyle(.plain)
                    .accessibilityIdentifier("add.date.another")
            }
        }
    }

    private struct AddOption: Identifiable, Equatable { let id: Int; let name: String; var paletteID: Int? = nil; var showsSwatch = false }
    private func optionValues(_ field: AddRouteField) -> [AddOption] {
        switch field {
        case .alcoholType: if case .loaded(let values) = addDrinkStore.alcoholTypes { values.map { AddOption(id:$0.id,name:$0.name,paletteID:$0.colorPaletteId,showsSwatch:true) } } else { [] }
        case .volume: if case .loaded(let values) = addDrinkStore.volumes { values.map { AddOption(id:$0.id,name:AddDrinkStore.volumeLabel($0)) } } else { [] }
        case .subtype: if case .loaded(let values) = addDrinkStore.subtypes { values.map { AddOption(id:$0.id,name:$0.name,paletteID:DesignResolver.alcoholPaletteID(subtype:$0.colorPaletteId,alcoholType:addDrinkStore.draft.alcoholType?.colorPaletteId),showsSwatch:true) } } else { [] }
        case .consumptionType: if case .loaded(let values) = addDrinkStore.consumptionTypes { values.map { AddOption(id:$0.id,name:$0.name) } } else { [] }
        case .brand: if case .loaded(let values) = addDrinkStore.brands { values.map { AddOption(id:$0.id,name:$0.name,paletteID:DesignResolver.beerPaletteID(flavour:nil,brand:$0.colorPaletteId,alcoholType:addDrinkStore.draft.alcoholType?.colorPaletteId),showsSwatch:true) } } else { [] }
        case .flavour: if case .loaded(let values) = addDrinkStore.flavours { values.map { AddOption(id:$0.id,name:$0.name,paletteID:DesignResolver.beerPaletteID(flavour:$0.colorPaletteId,brand:addDrinkStore.draft.brand?.colorPaletteId,alcoholType:addDrinkStore.draft.alcoholType?.colorPaletteId),showsSwatch:true) } } else { [] }
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
        switch field { case .alcoholType: "What are you drinking?"; case .volume: "What size?"; case .subtype: "Which kind?"; case .consumptionType: "How is it served?"; case .brand: "Which brand?"; case .flavour: "Which flavour?"; case .date: "When was it?"; case .notes: "Notes"; case .recommend: "Recommendations" }
    }
    /// Mirrors web `CREATE_LABELS`; fields that cannot be created have no label.
    private func fieldName(_ field: AddRouteField) -> String { creatable(field).map(fieldName) ?? "" }
    /// Same names for a create panel heading, like web `CREATE_TITLES`.
    private func fieldName(_ field: AddCreatableField) -> String {
        switch field { case .alcoholType: "drink type"; case .volume: "size"; case .subtype: "subtype"; case .brand: "brand"; case .flavour: "flavour" }
    }
    private func createPanel(_ field: AddCreatableField) -> some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("New \(fieldName(field))").font(theme.type.displayM.font).padding(.horizontal, 20)
                .accessibilityIdentifier(field == .alcoholType ? "frame.add.create.alcoholType" : "add.create.title")
            TextField("Name", text: Binding(get: { addDrinkStore.draft.creationName }, set: { addDrinkStore.draft.creationName = $0 }))
                .drinkSaverField().padding(.horizontal, 20).disabled(addDrinkStore.isCreating).accessibilityIdentifier("add.create.name")
            if field == .volume {
                TextField("Litres", text: Binding(get: { addDrinkStore.draft.volumeLitres }, set: { addDrinkStore.draft.volumeLitres = $0 }))
                    .keyboardType(.decimalPad).drinkSaverField().padding(.horizontal, 20).accessibilityLabel("Litres")
            }
            if field != .volume, field != .flavour {
                    designRow("Color palette", glass: false, selection: Binding(get: { addDrinkStore.draft.newEntryColorPaletteId }, set: { addDrinkStore.draft.newEntryColorPaletteId = $0 }), paletteSelection: addDrinkStore.draft.newEntryColorPaletteId, inheritedPalette: addDrinkStore.draft.inheritedPaletteID(for: field), inheritedGlass: nil)
                if field != .brand {
                        designRow("Glassware", glass: true, selection: Binding(get: { addDrinkStore.draft.newEntryGlasswareId }, set: { addDrinkStore.draft.newEntryGlasswareId = $0 }), paletteSelection: addDrinkStore.draft.newEntryColorPaletteId, inheritedPalette: addDrinkStore.draft.inheritedPaletteID(for: field), inheritedGlass: addDrinkStore.draft.inheritedGlasswareID(for: field))
                }
            }
            Button(addDrinkStore.isCreating ? "Adding…" : "Add and use it") { Task { await addDrinkStore.create(field, name: addDrinkStore.draft.creationName, litres: field == .volume ? Double(addDrinkStore.draft.volumeLitres) : nil) } }
                .buttonStyle(.drinkSaver()).padding(.horizontal, 20).disabled(!addDrinkStore.draft.canCreate(field) || addDrinkStore.isCreating).accessibilityIdentifier("add.create.submit")
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
