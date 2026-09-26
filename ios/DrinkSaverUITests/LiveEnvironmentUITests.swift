import XCTest

@MainActor
final class LiveEnvironmentUITests: XCTestCase {
    func testLocalReadSaveUndoEditDeleteJourneyCleansUpCreatedRecords() {
        let app = XCUIApplication()
        signInIfNeeded(app)
        XCTAssertTrue(app.staticTexts["frame.title"].waitForExistence(timeout: 30))

        app.buttons["frame.menu"].tap()
        app.buttons["Recommendations"].tap()
        XCTAssertTrue(app.staticTexts["recommendations.count"].waitForExistence(timeout: 15))
        XCTAssertFalse(app.staticTexts["recommendations.empty"].exists)
        app.buttons["frame.tab.quick"].tap()

        let plate = app.buttons.matching(NSPredicate(
            format: "identifier BEGINSWITH 'quick.plate.' AND identifier != 'quick.plate.add'"
        )).firstMatch
        XCTAssertTrue(plate.waitForExistence(timeout: 15))
        plate.tap()
        let quickUndo = app.buttons["quick.queue.undo"]
        XCTAssertTrue(quickUndo.waitForExistence(timeout: 10))
        quickUndo.tap()
        XCTAssertTrue(waitUntilAbsent(quickUndo, timeout: 10))

        app.buttons["frame.tab.history"].tap()
        XCTAssertTrue(app.staticTexts["history.count"].waitForExistence(timeout: 15))
        let existingHistoryIDs = Set(historyRowIDs(in: app))

        let recommendationName = "Live 23C \(UUID().uuidString)"
        app.buttons["frame.tab.add"].tap()
        app.buttons["Drink, Choose"].tap()
        let wine = app.buttons["Wine"]
        XCTAssertTrue(wine.waitForExistence(timeout: 10))
        wine.tap()
        app.buttons["Size, Choose"].tap()
        let volume = app.buttons["Large glass (0.3L)"]
        XCTAssertTrue(volume.waitForExistence(timeout: 10))
        volume.tap()
        let addRecommendation = app.switches["Add to recommendations"]
        XCTAssertTrue(addRecommendation.waitForExistence(timeout: 5))
        if addRecommendation.value as? String != "1" { addRecommendation.tap() }
        let nameField = app.textFields["Recommendation name"]
        XCTAssertTrue(nameField.waitForExistence(timeout: 5))
        nameField.tap()
        nameField.typeText(recommendationName)
        app.buttons["add.save"].tap()

        app.buttons["frame.tab.history"].tap()
        let createdRow = waitForNewHistoryRow(in: app, excluding: existingHistoryIDs, timeout: 25)
        XCTAssertNotNil(createdRow, "The detailed save should appear in today's History")
        if let createdRow {
            let row = app.descendants(matching: .any).matching(identifier: createdRow).firstMatch
            let crossOff = row.buttons.matching(NSPredicate(format: "label BEGINSWITH 'Cross off '")).firstMatch
            XCTAssertTrue(crossOff.waitForExistence(timeout: 5))
            crossOff.tap()
            let historyUndo = app.buttons["frame.queue.undo"]
            XCTAssertTrue(historyUndo.waitForExistence(timeout: 5))
            historyUndo.tap()
            XCTAssertTrue(row.waitForExistence(timeout: 5), "Undo should restore the saved drink")
            row.buttons.matching(NSPredicate(format: "label BEGINSWITH 'Cross off '")).firstMatch.tap()
            RunLoop.main.run(until: Date().addingTimeInterval(8))
            app.buttons["frame.tab.quick"].tap()
            app.buttons["frame.tab.history"].tap()
            XCTAssertTrue(waitUntilAbsent(row, timeout: 15), "The test drink should stay deleted after History reloads")
        }

        app.buttons["frame.menu"].tap()
        app.buttons["Recommendations"].tap()
        let createdRecommendation = app.staticTexts.matching(NSPredicate(format: "label == %@", recommendationName)).firstMatch
        XCTAssertTrue(createdRecommendation.waitForExistence(timeout: 15))
        let recommendationID = String(createdRecommendation.identifier.dropFirst("recommendations.row.name.".count))
        app.buttons["recommendations.rename-button.\(recommendationID)"].tap()
        let renameField = app.textFields["recommendations.rename.\(recommendationID)"]
        XCTAssertTrue(renameField.waitForExistence(timeout: 5))
        renameField.tap()
        let replacementName = "\(recommendationName) edited"
        renameField.typeText(String(repeating: XCUIKeyboardKey.delete.rawValue, count: recommendationName.count))
        renameField.typeText(replacementName)
        app.buttons["Save name"].tap()
        app.buttons["recommendations.save"].tap()
        XCTAssertTrue(app.staticTexts.matching(NSPredicate(format: "label == %@", replacementName)).firstMatch
            .waitForExistence(timeout: 15))

        app.buttons["recommendations.delete.\(recommendationID)"].tap()
        let deletedRecommendation = app.staticTexts.matching(NSPredicate(format: "label == %@", replacementName)).firstMatch
        XCTAssertTrue(waitUntilAbsent(deletedRecommendation, timeout: 10), "The test recommendation should disappear")
        RunLoop.main.run(until: Date().addingTimeInterval(8))
        app.buttons["frame.tab.quick"].tap()
        app.buttons["frame.menu"].tap()
        app.buttons["Recommendations"].tap()
        XCTAssertFalse(app.staticTexts.matching(NSPredicate(format: "label == %@", replacementName)).firstMatch
            .waitForExistence(timeout: 10), "Reloaded recommendations should confirm the test entry was deleted")

        XCTAssertTrue(app.staticTexts["recommendations.count"].exists, "Recommendations remain readable after the write and cleanup journey")
    }

    private func signInIfNeeded(_ app: XCUIApplication) {
        app.launch()
        let signIn = app.buttons["Sign in"]
        guard signIn.waitForExistence(timeout: 15) else { return }
        signIn.tap()

        let username = app.textFields["username"]
        XCTAssertTrue(username.waitForExistence(timeout: 30), "Local Keycloak login should open")
        username.tap()
        username.typeText("dev")
        let password = app.secureTextFields["password"]
        XCTAssertTrue(password.waitForExistence(timeout: 5))
        password.tap()
        password.typeText("dev")
        let submit = app.buttons.matching(NSPredicate(format: "label CONTAINS[c] 'sign in'")).firstMatch
        XCTAssertTrue(submit.waitForExistence(timeout: 5))
        submit.tap()
    }

    private func historyRowIDs(in app: XCUIApplication) -> [String] {
        app.descendants(matching: .any).matching(NSPredicate(
            format: "identifier BEGINSWITH 'history.row.'"
        )).allElementsBoundByIndex.map(\.identifier)
    }

    private func waitForNewHistoryRow(in app: XCUIApplication, excluding existing: Set<String>, timeout: TimeInterval) -> String? {
        let deadline = Date().addingTimeInterval(timeout)
        while Date() < deadline {
            if let created = historyRowIDs(in: app).first(where: {
                guard !existing.contains($0), let rawID = $0.split(separator: ".").last,
                      let id = Int(rawID) else { return false }
                return id > 0
            }) { return created }
            RunLoop.main.run(until: Date().addingTimeInterval(0.5))
        }
        return nil
    }

    private func waitUntilAbsent(_ element: XCUIElement, timeout: TimeInterval) -> Bool {
        let expectation = XCTNSPredicateExpectation(predicate: NSPredicate(format: "exists == false"), object: element)
        return XCTWaiter.wait(for: [expectation], timeout: timeout) == .completed
    }
}
