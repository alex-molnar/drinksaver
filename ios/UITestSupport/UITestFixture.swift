#if UI_TESTING
import Foundation
import SwiftUI

struct UITestFixture: Sendable {
    let identifier: String
    let fixedNow: Date
    let localeIdentifier: String
    let contentSize: DynamicTypeSize
    let reduceMotion: Bool

    static func parse(arguments: [String]) throws -> UITestFixture? {
        let fixtureArguments = [
            "-ui-fixture",
            "-ui-fixed-now",
            "-ui-locale",
            "-ui-content-size",
            "-ui-reduce-motion"
        ]
        guard arguments.contains(where: fixtureArguments.contains) else { return nil }

        let identifier = try requiredValue(for: "-ui-fixture", in: arguments)
        guard ["signed-in", "signed-in-api-failure", "signed-in-save-failure"].contains(identifier) else {
            throw InvalidUITestFixtureArguments("Unknown UI fixture '\(identifier)'.")
        }
        let dateText = try requiredValue(for: "-ui-fixed-now", in: arguments)
        let formatter = ISO8601DateFormatter()
        guard let fixedNow = formatter.date(from: dateText) else {
            throw InvalidUITestFixtureArguments("Invalid -ui-fixed-now value '\(dateText)'.")
        }
        let locale = try requiredValue(for: "-ui-locale", in: arguments)
        let contentSize = try requiredValue(for: "-ui-content-size", in: arguments)
        let reduceMotionText = try requiredValue(for: "-ui-reduce-motion", in: arguments)
        guard let dynamicTypeSize = dynamicTypeSize(for: contentSize) else {
            throw InvalidUITestFixtureArguments("Invalid -ui-content-size value '\(contentSize)'.")
        }
        guard let reduceMotion = Bool(reduceMotionText) else {
            throw InvalidUITestFixtureArguments("Invalid -ui-reduce-motion value '\(reduceMotionText)'.")
        }

        return UITestFixture(
            identifier: identifier,
            fixedNow: fixedNow,
            localeIdentifier: locale,
            contentSize: dynamicTypeSize,
            reduceMotion: reduceMotion
        )
    }

    private static func requiredValue(for flag: String, in arguments: [String]) throws -> String {
        guard let index = arguments.firstIndex(of: flag),
              arguments.indices.contains(index + 1),
              !arguments[index + 1].hasPrefix("-") else {
            throw InvalidUITestFixtureArguments("Missing value for UI test argument '\(flag)'.")
        }
        return arguments[index + 1]
    }

    private static func dynamicTypeSize(for value: String) -> DynamicTypeSize? {
        switch value {
        case "xSmall": .xSmall
        case "small": .small
        case "medium": .medium
        case "large": .large
        case "xLarge": .xLarge
        case "xxLarge": .xxLarge
        case "xxxLarge": .xxxLarge
        case "accessibility1": .accessibility1
        case "accessibility2": .accessibility2
        case "accessibility3": .accessibility3
        case "accessibility4": .accessibility4
        case "accessibility5": .accessibility5
        default: nil
        }
    }
}

struct InvalidUITestFixtureArguments: Error, CustomStringConvertible {
    let description: String

    init(_ description: String) {
        self.description = description
    }
}
#endif
