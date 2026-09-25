import XCTest
@testable import DrinkSaver

final class AppFrameTests: XCTestCase {
    func testQuickHeaderUsesTonightAndCountOnlyWhenDayIsReady() {
        XCTAssertEqual(AppFrameHeader.make(screen: .quick, isTonight: true, dayState: .idle, drinkCount: 3),
                       AppFrameHeader(title: "Tonight", subtitle: nil))
        XCTAssertEqual(AppFrameHeader.make(screen: .quick, isTonight: false, dayState: .ready, drinkCount: 0),
                       AppFrameHeader(title: "Today", subtitle: "Nothing yet"))
        XCTAssertEqual(AppFrameHeader.make(screen: .quick, isTonight: true, dayState: .ready, drinkCount: 2),
                       AppFrameHeader(title: "Tonight", subtitle: "2 so far"))
    }

    func testOtherFrameTitles() {
        XCTAssertEqual(AppFrameHeader.make(screen: .history, isTonight: false, dayState: .idle, drinkCount: 0),
                       AppFrameHeader(title: "History", subtitle: "Today"))
        XCTAssertEqual(AppFrameHeader.make(screen: .recommendations, isTonight: false, dayState: .idle, drinkCount: 0),
                       AppFrameHeader(title: "Recommendations", subtitle: nil))
    }
}
