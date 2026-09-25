import XCTest
@testable import DrinkSaver

final class QuickSaveLayoutTests: XCTestCase {
    func testPlateRotationSequenceIsStableAndRepeatsByPosition() {
        XCTAssertEqual(QuickSaveLayout.rotations, [-0.7, 0.5, 0.8, -0.5, 0.4, -0.8, 0.6])
        XCTAssertEqual(QuickSaveLayout.rotation(at: 0), QuickSaveLayout.rotation(at: 7))
        XCTAssertNotEqual(QuickSaveLayout.rotation(at: 0), QuickSaveLayout.rotation(at: 1))
    }

    func testTwoColumnGridAlwaysKeepsAddPlateAsTheLastEntry() {
        XCTAssertEqual(QuickSaveLayout.rowCount(recommendationCount: 0), 1)
        XCTAssertEqual(QuickSaveLayout.rowCount(recommendationCount: 1), 1)
        XCTAssertEqual(QuickSaveLayout.rowCount(recommendationCount: 2), 2)
        let position = QuickSaveLayout.addPlatePosition(recommendationCount: 3)
        XCTAssertEqual(position.row, 1)
        XCTAssertEqual(position.column, 1)
    }
}
