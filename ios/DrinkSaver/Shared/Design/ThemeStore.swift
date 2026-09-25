import Foundation
import Observation

@MainActor
@Observable
final class ThemeStore {
    static let storageKey = "drinksaver-theme"

    private let defaults: UserDefaults
    private(set) var mode: ThemeMode {
        didSet { defaults.set(mode.rawValue, forKey: Self.storageKey) }
    }

    var theme: DrinkSaverTheme { mode == .dark ? .dark : .light }

    init(defaults: UserDefaults = .standard) {
        self.defaults = defaults
        self.mode = defaults.string(forKey: Self.storageKey).flatMap(ThemeMode.init(rawValue:)) ?? .dark
    }

    func toggle() {
        mode = mode == .dark ? .light : .dark
    }
}
