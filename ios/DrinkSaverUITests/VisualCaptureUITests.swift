import ImageIO
import XCTest
import UIKit

@MainActor
final class VisualCaptureUITests: XCTestCase {
    private let states = [
        "quick-ready", "quick-loading", "quick-error", "history-populated", "history-empty",
        "history-error", "recs-ready", "recs-empty", "recs-error", "add-root"
    ]

    func testCaptureReferenceMatrix() throws {
        XCUIDevice.shared.orientation = .portrait
        for state in states {
            for theme in ["dark", "light"] {
                let app = XCUIApplication()
                launch(app, state: state, theme: theme)
                showState(state, in: app)

                let points = app.windows.firstMatch.frame.size
                let width = Int(points.width.rounded())
                let height = Int(points.height.rounded())
                let viewport = "\(width)x\(height)"
                let name = "\(state)-\(theme)-\(viewport)"
                let screenshot = app.screenshot().image
                let normalized = try normalizedPNG(screenshot, viewport: viewport, theme: theme)
                let attachment = XCTAttachment(data: normalized, uniformTypeIdentifier: "public.png")
                attachment.name = name
                attachment.lifetime = .keepAlways
                add(attachment)
                app.terminate()
            }
        }
    }

    private func launch(_ app: XCUIApplication, state: String, theme: String) {
        let failing = ["quick-error", "history-error", "recs-error"].contains(state)
        app.launchEnvironment["TZ"] = "Europe/Amsterdam"
        app.launchArguments = [
            "-ui-fixture", failing ? "signed-in-api-failure" : "signed-in",
            "-ui-fixed-now", "2026-09-10T12:00:00Z",
            "-ui-locale", "en-GB",
            "-ui-content-size", "large",
            "-ui-reduce-motion", "true",
            "-ui-reference-state", state,
            "-drinksaver-theme", theme
        ]
        app.launch()
    }

    private func showState(_ state: String, in app: XCUIApplication) {
        switch state {
        case "quick-loading": XCTAssertTrue(app.otherElements["quick.loading"].waitForExistence(timeout: 5))
        case "quick-error": XCTAssertTrue(app.staticTexts["quick.error"].waitForExistence(timeout: 5))
        case "quick-ready": XCTAssertTrue(app.buttons["Heineken pint"].waitForExistence(timeout: 5))
        case "history-populated", "history-empty", "history-error":
            app.buttons["frame.tab.history"].tap()
            if state == "history-error" {
                XCTAssertTrue(app.buttons["history.retry"].waitForExistence(timeout: 5))
            } else if state == "history-empty" {
                XCTAssertTrue(app.staticTexts["history.empty"].waitForExistence(timeout: 5))
            } else {
                XCTAssertTrue(app.staticTexts["history.count"].waitForExistence(timeout: 5))
            }
        case "recs-ready", "recs-empty", "recs-error":
            app.buttons["frame.menu"].tap()
            app.buttons["Recommendations"].tap()
            switch state {
            case "recs-error": XCTAssertTrue(app.buttons["recommendations.retry"].waitForExistence(timeout: 5))
            case "recs-empty": XCTAssertTrue(app.staticTexts["recommendations.empty"].waitForExistence(timeout: 5))
            default: XCTAssertTrue(app.staticTexts["recommendations.count"].waitForExistence(timeout: 5))
            }
        case "add-root":
            app.buttons["frame.tab.add"].tap()
            XCTAssertTrue(app.otherElements["frame.add-sheet"].waitForExistence(timeout: 5))
        default: break
        }
    }

    private func normalizedPNG(_ image: UIImage, viewport: String, theme: String) throws -> Data {
        guard let source = image.cgImage,
              let (topInset, bottomInset) = safeInsets(for: viewport),
              let colorSpace = CGColorSpace(name: CGColorSpace.sRGB) else {
            throw CaptureError.unsupportedScreen(viewport)
        }
        let points = viewport.split(separator: "x").compactMap { Int($0) }
        guard points.count == 2 else { throw CaptureError.unsupportedScreen(viewport) }
        let targetWidth = points[0] * 3
        let targetHeight = (points[1] - topInset - bottomInset) * 3
        let sourceScale = CGFloat(source.width) / CGFloat(points[0])
        let sourceRect = CGRect(
            x: 0,
            y: CGFloat(topInset) * sourceScale,
            width: CGFloat(source.width),
            height: CGFloat(points[1] - topInset - bottomInset) * sourceScale
        ).integral
        guard let cropped = source.cropping(to: sourceRect),
              let context = CGContext(
                data: nil,
                width: targetWidth,
                height: targetHeight,
                bitsPerComponent: 8,
                bytesPerRow: targetWidth * 4,
                space: colorSpace,
                bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue | CGBitmapInfo.byteOrder32Big.rawValue
              ) else { throw CaptureError.normalizationFailed(viewport) }

        let background = theme == "dark" ? CGColor(red: 35 / 255.0, green: 21 / 255.0, blue: 18 / 255.0, alpha: 1)
                                          : CGColor(red: 235 / 255.0, green: 220 / 255.0, blue: 192 / 255.0, alpha: 1)
        context.setFillColor(background)
        context.fill(CGRect(x: 0, y: 0, width: targetWidth, height: targetHeight))
        context.interpolationQuality = .high
        context.draw(cropped, in: CGRect(x: 0, y: 0, width: targetWidth, height: targetHeight))
        guard let normalized = context.makeImage() else { throw CaptureError.normalizationFailed(viewport) }

        let data = NSMutableData()
        guard let imageDestination = CGImageDestinationCreateWithData(data, "public.png" as CFString, 1, nil) else {
            throw CaptureError.normalizationFailed(viewport)
        }
        CGImageDestinationAddImage(imageDestination, normalized, nil)
        CGImageDestinationFinalize(imageDestination)
        return data as Data
    }

    private func safeInsets(for viewport: String) -> (Int, Int)? {
        switch viewport {
        case "375x667": (20, 0)
        case "375x812": (47, 34)
        case "440x956": (59, 34)
        default: nil
        }
    }

    private enum CaptureError: Error { case unsupportedScreen(String), normalizationFailed(String) }
}
