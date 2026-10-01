import XCTest
@testable import DrinkSaver

final class RecommendationRowStyleTests: XCTestCase {
    func testIconsAreVisibleOnPaperInBothThemes() {
        for theme in [DrinkSaverTheme.dark, .light] {
            let ink = RecommendationRowStyle.icon(theme: theme)
            XCTAssertGreaterThanOrEqual(contrastRatio(ink, theme.surface.paper), 3, "\(theme.ink.onPaper.hex)")
            XCTAssertGreaterThanOrEqual(contrastRatio(RecommendationRowStyle.grip(theme: theme), theme.surface.paper), 3)
        }
    }
}
