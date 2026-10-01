import XCTest
import Vision

@MainActor
final class RecommendationsUITests: XCTestCase {
    func testShowsOnlyPersistedPersonalRecommendations() {
        let app = openRecommendations()
        XCTAssertEqual(app.staticTexts["frame.title"].label, "Recommendations")
        XCTAssertEqual(app.staticTexts["recommendations.count"].label, "2 saved")
        XCTAssertTrue(app.staticTexts["recommendations.row.name.9"].exists)
        XCTAssertTrue(app.staticTexts["recommendations.row.name.10"].exists)
        XCTAssertFalse(app.staticTexts["Golden lager"].exists)
    }

    func testMoveButtonsAreAccessibleAndCancelRestoresOrder() {
        let app = openRecommendations()
        let house = app.staticTexts["recommendations.row.name.9"]
        let amber = app.staticTexts["recommendations.row.name.10"]
        XCTAssertTrue(house.waitForExistence(timeout: 5))
        XCTAssertLessThan(house.frame.minY, amber.frame.minY)

        app.buttons["recommendations.move-down.9"].tap()
        XCTAssertGreaterThan(house.frame.minY, amber.frame.minY)
        XCTAssertTrue(app.buttons["recommendations.save"].exists)
        app.buttons["recommendations.cancel"].tap()
        XCTAssertLessThan(house.frame.minY, amber.frame.minY)
    }

    func testDraggingRecommendationReordersRowsVertically() {
        let app = openRecommendations(reduceMotion: false)
        let house = app.staticTexts["recommendations.row.name.9"]
        let amber = app.staticTexts["recommendations.row.name.10"]
        XCTAssertTrue(amber.waitForExistence(timeout: 5))
        XCTAssertLessThan(house.frame.minY, amber.frame.minY)
        XCTAssertEqual(recognizedOccurrences(of: house.label, in: app), 1)
        XCTAssertEqual(recognizedOccurrences(of: amber.label, in: app), 1)

        let grabX = house.frame.minX - 22
        let start = app.coordinate(withNormalizedOffset: CGVector(dx: grabX / app.frame.width, dy: house.frame.midY / app.frame.height))
        let finish = app.coordinate(withNormalizedOffset: CGVector(dx: grabX / app.frame.width, dy: amber.frame.maxY / app.frame.height))
        start.press(
            forDuration: 0.3,
            thenDragTo: finish
        )

        XCTAssertGreaterThan(house.frame.minY, amber.frame.minY)
        for _ in 0..<6 {
            XCTAssertEqual(recognizedOccurrences(of: house.label, in: app), 1, "the dragged recommendation should appear once per captured frame")
            XCTAssertEqual(recognizedOccurrences(of: amber.label, in: app), 1, "the target recommendation should appear once per captured frame")
            Thread.sleep(forTimeInterval: 0.1)
        }
        XCTAssertTrue(app.buttons["recommendations.save"].exists)
    }

    func testControlsOrderIsRenameArrowsDeleteAndGripShows() {
        let app = openRecommendations()
        let rename = app.buttons["recommendations.rename-button.9"]
        let down = app.buttons["recommendations.move-down.9"]
        let delete = app.buttons["recommendations.delete.9"]
        XCTAssertTrue(delete.waitForExistence(timeout: 5))
        XCTAssertLessThan(rename.frame.maxX, down.frame.minX + 1)
        XCTAssertLessThan(down.frame.maxX, delete.frame.minX + 1)
        XCTAssertGreaterThan(delete.frame.maxX, app.frame.maxX - 60)
        // The grip is decorative (accessibility hidden), so check its gutter: the name starts to its right.
        let name = app.staticTexts["recommendations.row.name.9"]
        XCTAssertGreaterThanOrEqual(name.frame.minX, app.frame.minX + 14 + 20, "room left of the name for the grip")
        for b in [down, rename, delete] {
            XCTAssertGreaterThanOrEqual(b.frame.width, 43.9)
            XCTAssertGreaterThanOrEqual(b.frame.height, 43.9)
        }
    }

    func testRenameSaveCommitsAndReturnsToQuick() {
        let app = openRecommendations()
        app.buttons["recommendations.rename-button.9"].tap()
        let field = app.textFields["recommendations.rename.9"]
        XCTAssertTrue(field.waitForExistence(timeout: 3))
        let original = field.value as? String ?? "House pilsner"
        field.tap()
        field.typeText(String(repeating: XCUIKeyboardKey.delete.rawValue, count: original.count) + "New house")
        app.buttons["Save name"].tap()
        app.buttons["recommendations.save"].tap()

        let quick = app.buttons["frame.tab.quick"]
        XCTAssertTrue(quick.waitForExistence(timeout: 5))
        let selected = NSPredicate(format: "value == 'Selected'")
        expectation(for: selected, evaluatedWith: quick)
        waitForExpectations(timeout: 5)
    }

    func testEditActionsAreIconButtonsWithNamesAndTargets() {
        let app = openRecommendations()
        let nameX = app.staticTexts["recommendations.row.name.9"].frame.minX
        app.buttons["recommendations.rename-button.9"].tap()
        XCTAssertEqual(app.textFields["recommendations.rename.9"].frame.minX, nameX, accuracy: 1, "field starts where the name did, no jump")
        for id in ["recommendations.rename-done.9", "recommendations.rename-cancel.9"] {
            let b = app.buttons[id]
            XCTAssertTrue(b.waitForExistence(timeout: 3), id)
            XCTAssertGreaterThanOrEqual(b.frame.width, 43.9)
            XCTAssertGreaterThanOrEqual(b.frame.height, 43.9)
        }
        XCTAssertEqual(app.buttons["recommendations.rename-done.9"].label, "Save name")
        XCTAssertEqual(app.buttons["recommendations.rename-cancel.9"].label, "Cancel name")
        app.buttons["recommendations.rename-cancel.9"].tap()
        XCTAssertTrue(app.buttons["recommendations.rename-button.9"].waitForExistence(timeout: 3))
    }

    func testStartingRenameRaisesKeyboardWithoutTappingTheField() {
        let app = openRecommendations()
        app.buttons["recommendations.rename-button.9"].tap()
        XCTAssertTrue(app.textFields["recommendations.rename.9"].waitForExistence(timeout: 3))
        XCTAssertTrue(app.keyboards.firstMatch.waitForExistence(timeout: 5), "rename should focus its field")
    }

    func testStartingRenameOnBottomRowKeepsKeyboardFocused() {
        let app = openRecommendations(referenceState: "recs-ready", reduceMotion: false)
        let rows = app.scrollViews["recommendations.rows"]
        let rename = app.buttons["recommendations.rename-button.6"]
        for _ in 0..<10 where !rename.isHittable { rows.swipeUp() }
        XCTAssertTrue(rename.isHittable)
        rename.tap()
        let field = app.textFields["recommendations.rename.6"]
        XCTAssertTrue(field.waitForExistence(timeout: 3))
        let keyboard = app.keyboards.firstMatch
        XCTAssertTrue(keyboard.waitForExistence(timeout: 5), "bottom-row rename should focus its field")
        for _ in 0..<6 {
            XCTAssertTrue(keyboard.exists, "keyboard must stay open while the bottom row is edited")
            XCTAssertTrue(field.isHittable)
            Thread.sleep(forTimeInterval: 0.25)
        }
        let initialValue = field.value as? String ?? ""
        app.typeText("x")
        XCTAssertEqual(field.value as? String, initialValue + "x", "the bottom-row field must remain the active keyboard target")
    }

    func testReturningToActiveRenameRestoresKeyboardFocus() {
        let app = openRecommendations(reduceMotion: false)
        app.buttons["recommendations.rename-button.9"].tap()
        XCTAssertTrue(app.keyboards.firstMatch.waitForExistence(timeout: 5))

        app.buttons["frame.tab.quick"].tap()
        app.buttons["frame.menu"].tap()
        app.buttons["Recommendations"].tap()

        XCTAssertTrue(app.textFields["recommendations.rename.9"].waitForExistence(timeout: 3))
        XCTAssertTrue(app.keyboards.firstMatch.waitForExistence(timeout: 5), "an active rename should regain focus when Recommendations is recreated")
    }

    func testTappingLowerRecommendationNamesKeepsKeyboardUsable() {
        let app = openRecommendations(referenceState: "recs-ready", reduceMotion: false)
        let rows = app.scrollViews["recommendations.rows"]
        for id in [4, 5, 6] {
            let name = app.staticTexts["recommendations.row.name.\(id)"]
            for _ in 0..<6 where !name.isHittable { rows.swipeUp() }
            XCTAssertTrue(name.isHittable)
            name.tap()
            let field = app.textFields["recommendations.rename.\(id)"]
            XCTAssertTrue(field.waitForExistence(timeout: 3))
            XCTAssertTrue(app.keyboards.firstMatch.waitForExistence(timeout: 5))
            let original = field.value as? String ?? ""
            for _ in 0..<8 {
                XCTAssertTrue(app.keyboards.firstMatch.exists)
                Thread.sleep(forTimeInterval: 0.25)
            }
            app.typeText("x")
            XCTAssertEqual(field.value as? String, original + "x")
            app.buttons["recommendations.rename-cancel.\(id)"].tap()
        }
    }

    func testScrolledLastRecommendationKeepsKeyboardUsable() {
        let app = openRecommendations(referenceState: "recs-long", reduceMotion: false)
        let rows = app.scrollViews["recommendations.rows"]
        let rename = app.buttons["recommendations.rename-button.120"]
        for _ in 0..<12 where !rename.isHittable { rows.swipeUp() }
        XCTAssertTrue(rename.isHittable)
        rename.tap()
        let field = app.textFields["recommendations.rename.120"]
        XCTAssertTrue(field.waitForExistence(timeout: 3))
        XCTAssertTrue(app.keyboards.firstMatch.waitForExistence(timeout: 5))
        let original = field.value as? String ?? ""
        Thread.sleep(forTimeInterval: 2)
        XCTAssertTrue(app.keyboards.firstMatch.exists)
        app.typeText("x")
        XCTAssertEqual(field.value as? String, original + "x")
    }

    func testCrossOffCanBeUndone() {
        let app = openRecommendations()
        let house = app.staticTexts["recommendations.row.name.9"]
        XCTAssertTrue(house.waitForExistence(timeout: 5))
        app.buttons["recommendations.delete.9"].tap()
        let undo = app.buttons["frame.queue.undo"]
        XCTAssertTrue(undo.waitForExistence(timeout: 3))
        undo.tap()
        XCTAssertTrue(house.waitForExistence(timeout: 3))
    }

    func testLoadFailureCanRetry() {
        let app = openRecommendations(fixture: "signed-in-api-failure")
        let retry = app.buttons["recommendations.retry"]
        XCTAssertTrue(retry.waitForExistence(timeout: 5))
        retry.tap()
        XCTAssertTrue(retry.waitForExistence(timeout: 3))
    }

    private func openRecommendations(fixture: String = "signed-in", referenceState: String? = nil, reduceMotion: Bool = true) -> XCUIApplication {
        let app = XCUIApplication()
        app.launchArguments = [
            "-ui-fixture", fixture,
            "-ui-fixed-now", "2026-01-02T18:04:05Z",
            "-ui-locale", "en-US",
            "-ui-content-size", "large",
            "-ui-reduce-motion", reduceMotion ? "true" : "false"
        ]
        if let referenceState { app.launchArguments += ["-ui-reference-state", referenceState] }
        app.launch()
        app.buttons["frame.menu"].tap()
        app.buttons["Recommendations"].tap()
        return app
    }

    private func recognizedOccurrences(of text: String, in app: XCUIApplication) -> Int {
        guard let image = app.screenshot().image.cgImage else { return 0 }
        let request = VNRecognizeTextRequest()
        request.recognitionLevel = .accurate
        request.usesLanguageCorrection = false
        try? VNImageRequestHandler(cgImage: image).perform([request])
        return request.results?.filter {
            $0.topCandidates(1).first?.string.localizedCaseInsensitiveCompare(text) == .orderedSame
        }.count ?? 0
    }
}
