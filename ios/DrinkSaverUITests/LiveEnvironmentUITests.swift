import XCTest

@MainActor
final class LiveEnvironmentUITests: XCTestCase {
    private var existingHistoryIDs = Set<String>()
    private var historyBaselineCaptured = false
    private var saveSubmitted = false
    private var createdHistoryID: String?
    private var createdRecommendationID: String?
    private var createdRecommendationNames: [String] = []

    func testLiveEnvironmentReadSaveUndoEditDeleteJourneyCleansUpCreatedRecords() {
        let app = XCUIApplication()
        existingHistoryIDs = []
        historyBaselineCaptured = false
        saveSubmitted = false
        createdHistoryID = nil
        createdRecommendationID = nil
        createdRecommendationNames = []
        addTeardownBlock { [weak self] in self?.cleanupCreatedRecords(in: app) }

        signInIfNeeded(app)
        XCTAssertTrue(app.staticTexts["frame.title"].waitForExistence(timeout: 30))

        app.buttons["frame.menu"].tap()
        app.buttons["Recommendations"].tap()
        let recommendationsLoaded = app.descendants(matching: .any).matching(NSPredicate(
            format: "identifier IN %@", ["recommendations.empty", "recommendations.rows", "recommendations.retry"]
        )).firstMatch
        guard recommendationsLoaded.waitForExistence(timeout: 15), !app.buttons["recommendations.retry"].exists else {
            XCTFail("Recommendations should finish loading successfully")
            return
        }
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
        let historyLoaded = app.descendants(matching: .any).matching(NSPredicate(
            format: "identifier IN %@", ["history.empty", "history.rows", "history.retry"]
        )).firstMatch
        guard historyLoaded.waitForExistence(timeout: 15), !app.buttons["history.retry"].exists else {
            XCTFail("History should finish loading successfully before recording the cleanup baseline")
            return
        }
        existingHistoryIDs = Set(historyRowIDs(in: app))
        historyBaselineCaptured = true

        let recommendationName = "Live 23C \(UUID().uuidString)"
        createdRecommendationNames = [recommendationName]
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
        saveSubmitted = true
        app.buttons["add.save"].tap()

        app.buttons["frame.tab.history"].tap()
        let createdRow = waitForNewHistoryRow(in: app, excluding: existingHistoryIDs, timeout: 25)
        createdHistoryID = createdRow
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
        createdRecommendationID = recommendationID
        app.buttons["recommendations.rename-button.\(recommendationID)"].tap()
        let renameField = app.textFields["recommendations.rename.\(recommendationID)"]
        XCTAssertTrue(renameField.waitForExistence(timeout: 5))
        renameField.tap()
        let replacementName = "\(recommendationName) edited"
        createdRecommendationNames.append(replacementName)
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
        if app.staticTexts["frame.title"].waitForExistence(timeout: 5) { return }
        let signIn = app.buttons["Sign in"]
        XCTAssertTrue(signIn.waitForExistence(timeout: 15), "The app should reach the sign-in screen")
        signIn.tap()
        XCTAssertTrue(app.staticTexts["frame.title"].waitForExistence(timeout: 120),
                      "Complete sign-in in the selected environment's Keycloak browser session")
    }

    private func cleanupCreatedRecords(in app: XCUIApplication) {
        guard app.staticTexts["frame.title"].exists else {
            if saveSubmitted { XCTFail("Teardown could not open the app to clean up created records") }
            return
        }
        if app.buttons["frame.add.close"].isHittable { app.buttons["frame.add.close"].tap() }
        if app.buttons["Recommendations"].exists { app.buttons["frame.menu"].tap() }

        if historyBaselineCaptured {
            if app.buttons["frame.tab.history"].isHittable {
                app.buttons["frame.tab.history"].tap()
            } else {
                XCTFail("Teardown could not open History to clean up the test drink")
            }
            let historyID = createdHistoryID ?? waitForNewHistoryRow(in: app, excluding: existingHistoryIDs, timeout: saveSubmitted ? 15 : 3)
            if let historyID {
                let row = app.descendants(matching: .any).matching(identifier: historyID).firstMatch
                if row.waitForExistence(timeout: 3) {
                    let crossOff = row.buttons.matching(NSPredicate(format: "label BEGINSWITH 'Cross off '")).firstMatch
                    var deleteSettled = true
                    if crossOff.waitForExistence(timeout: 3) {
                        let drinkName = String(crossOff.label.dropFirst("Cross off ".count))
                        let deleteIsPending = app.buttons["frame.queue.undo"].exists
                            && app.staticTexts["frame.queue.message"].label == "Crossed off \(drinkName)"
                        if !deleteIsPending {
                            if crossOff.isHittable {
                                crossOff.tap()
                            } else {
                                deleteSettled = false
                                XCTFail("Teardown could not start deletion of the test drink")
                            }
                        }
                        RunLoop.main.run(until: Date().addingTimeInterval(8))
                        let deleteProgress = app.descendants(matching: .any)
                            .matching(identifier: "frame.queue.progress").firstMatch
                        if app.staticTexts["frame.queue.message"].label == "Deleting \(drinkName)…" {
                            deleteSettled = waitUntilAbsent(deleteProgress, timeout: 60)
                        }
                        if app.buttons["frame.queue.retry"].exists,
                           app.staticTexts["frame.queue.message"].label == "Could not delete." {
                            deleteSettled = false
                        }
                        if !deleteSettled {
                            XCTFail("The test drink delete did not succeed before teardown verification")
                        }
                    } else {
                        deleteSettled = false
                        XCTFail("Teardown could not find the test drink’s Cross off action")
                    }
                    app.buttons["frame.tab.quick"].tap()
                    app.buttons["frame.tab.history"].tap()
                    if !deleteSettled || !waitUntilAbsent(row, timeout: 15) {
                        XCTFail("The test drink remains in History after teardown cleanup")
                    }
                }
            } else if saveSubmitted {
                XCTFail("Teardown could not identify the created History row to clean up")
            }
        }

        guard !createdRecommendationNames.isEmpty else { return }
        let recommendationsMenuItem = app.buttons["Recommendations"]
        if !recommendationsMenuItem.exists { app.buttons["frame.menu"].tap() }
        guard recommendationsMenuItem.waitForExistence(timeout: 3) else {
            XCTFail("Teardown could not open Recommendations to clean up the test entry")
            return
        }
        recommendationsMenuItem.tap()
        let recommendationsLoaded = app.descendants(matching: .any).matching(NSPredicate(
            format: "identifier IN %@", ["recommendations.empty", "recommendations.rows", "recommendations.retry"]
        )).firstMatch
        guard recommendationsLoaded.waitForExistence(timeout: 10), !app.buttons["recommendations.retry"].exists else {
            XCTFail("Teardown could not load Recommendations to clean up the test entry")
            return
        }

        var recommendationIDs = createdRecommendationID.map { [$0] } ?? []
        for name in createdRecommendationNames {
            let rowName = app.staticTexts.matching(NSPredicate(format: "label == %@", name)).firstMatch
            if rowName.waitForExistence(timeout: 3) {
                let id = String(rowName.identifier.dropFirst("recommendations.row.name.".count))
                if id != rowName.identifier && !recommendationIDs.contains(id) { recommendationIDs.append(id) }
            }
        }
        if recommendationIDs.isEmpty && saveSubmitted {
            XCTFail("Teardown could not identify the created recommendation to clean up")
        }

        for id in recommendationIDs {
            let delete = app.buttons["recommendations.delete.\(id)"]
            guard delete.isHittable else {
                if delete.exists { XCTFail("Teardown could not delete recommendation \(id)") }
                continue
            }
            delete.tap()
            RunLoop.main.run(until: Date().addingTimeInterval(8))
            app.buttons["frame.tab.quick"].tap()
            let menuItem = app.buttons["Recommendations"]
            if !menuItem.exists { app.buttons["frame.menu"].tap() }
            guard menuItem.waitForExistence(timeout: 3) else {
                XCTFail("Teardown could not reload Recommendations to verify cleanup")
                return
            }
            menuItem.tap()
            let deleted = waitUntilAbsent(app.buttons["recommendations.delete.\(id)"], timeout: 15)
            if !deleted { XCTFail("Recommendation \(id) remains after teardown cleanup") }
        }
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
