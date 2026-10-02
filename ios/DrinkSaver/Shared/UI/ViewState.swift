import Foundation

struct AppFrameHeader: Equatable {
    let title: String
    let subtitle: String?

    static func make(screen: AppScreen, isTonight: Bool, dayState: CurrentDrinkingDayStore.State, drinkCount: Int) -> Self {
        switch screen {
        case .quick:
            let subtitle: String?
            if dayState == .ready {
                subtitle = drinkCount == 0 ? "Nothing yet" : "\(drinkCount) so far"
            } else {
                subtitle = nil
            }
            return Self(title: isTonight ? "Tonight" : "Today", subtitle: subtitle)
        case .history:
            return Self(title: "History", subtitle: "Today")
        case .recommendations:
            return Self(title: "Recommendations", subtitle: nil)
        }
    }
}
