import XCTest
@testable import DrinkSaver

final class HistoryRowInkTests: XCTestCase {
    func testRowControlsAreVisibleOnPaperInBothThemes() {
        for theme in [DrinkSaverTheme.dark, .light] {
            let paper = theme.surface.paper
            for ink in [HistoryRowInk.checkbox(selected: false, theme: theme),
                        HistoryRowInk.checkbox(selected: true, theme: theme),
                        HistoryRowInk.crossOff(theme: theme)] {
                XCTAssertGreaterThanOrEqual(contrastRatio(ink, paper), 3, "\(theme.ink.onPaper.hex)")
            }
        }
    }

    func testHeaderRuleIsVisibleOnPaperInBothThemes() {
        for theme in [DrinkSaverTheme.dark, .light] {
            let rule = HistoryRowInk.headerRule(theme: theme)
            XCTAssertGreaterThanOrEqual(contrastRatio(rule, theme.surface.paper), 1.5)
        }
    }

    func testRecommendationHeaderRuleUsesPaperRelativeInk() {
        for theme in [DrinkSaverTheme.dark, .light] {
            XCTAssertGreaterThanOrEqual(
                contrastRatio(HistoryRowInk.headerRule(theme: theme), theme.surface.paper),
                1.5
            )
        }
    }
}
