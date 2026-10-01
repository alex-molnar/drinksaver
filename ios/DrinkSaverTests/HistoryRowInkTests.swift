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
}
