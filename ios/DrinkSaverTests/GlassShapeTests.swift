import XCTest
import SwiftUI
@testable import DrinkSaver

final class GlassShapeTests: XCTestCase {
    private let box = CGRect(x: 0, y: 0, width: 24, height: 40)

    func testEveryBackendGlassPathFitsTheRenderBox() {
        for glass in DesignResolverTests.glasswareFixtures {
            for data in [glass.g, glass.l] + (glass.f.map { [$0] } ?? []) {
                let bounds = GlassShape(pathData: data).path(in: box).boundingRect
                XCTAssertFalse(bounds.isEmpty, "\(glass.name): \(data)")
                XCTAssertGreaterThanOrEqual(bounds.minX, box.minX - 0.001, glass.name)
                XCTAssertGreaterThanOrEqual(bounds.minY, box.minY - 0.001, glass.name)
                XCTAssertLessThanOrEqual(bounds.maxX, box.maxX + 0.001, glass.name)
                XCTAssertLessThanOrEqual(bounds.maxY, box.maxY + 0.001, glass.name)
            }
        }
    }

    func testGlassLayersKeepTheirSharedWebViewBoxPositions() throws {
        let scale = min(box.width / 34, box.height / 50)
        let highball = DesignCatalogue.fallbackGlass
        let outline = GlassShape(pathData: highball.g).path(in: box).boundingRect
        let liquid = GlassShape(pathData: highball.l).path(in: box).boundingRect
        XCTAssertEqual(liquid.minY - outline.minY, (13.6 - 4) * scale, accuracy: 0.001)
        XCTAssertEqual(liquid.minX - outline.minX, (11.4 - 10) * scale, accuracy: 0.001)

        let pint = DesignResolverTests.glasswareFixtures[0]
        let pintOutline = GlassShape(pathData: pint.g).path(in: box).boundingRect
        let pintLiquid = GlassShape(pathData: pint.l).path(in: box).boundingRect
        let foamPath = try XCTUnwrap(pint.f)
        let foam = GlassShape(pathData: foamPath).path(in: box).boundingRect
        XCTAssertEqual(pintLiquid.minY - pintOutline.minY, (15 - 5) * scale, accuracy: 0.001)
        XCTAssertEqual(foam.minY - pintOutline.minY, (8.4 - 5) * scale, accuracy: 0.001)
    }

    func testRelativeAndSmoothCurvesAndEllipticalArcsRender() {
        let data = "M2 2 c2 0 3 2 4 4 s2 4 4 4 a4 2 0 0 1 8 0 z"
        XCTAssertFalse(GlassShape(pathData: data).path(in: box).boundingRect.isEmpty)
    }

    func testMoveCoordinatePairsBecomeLinesAndDrawingCannotStartWithoutMove() {
        let implicitLine = GlassShape(pathData: "M0 0 10 10").path(in: box).boundingRect
        let explicitLine = GlassShape(pathData: "M0 0L10 10").path(in: box).boundingRect
        XCTAssertEqual(implicitLine, explicitLine)

        let invalidStart = GlassShape(pathData: "L0 0 10 10").path(in: box).boundingRect
        let fallback = GlassShape(pathData: DesignCatalogue.fallbackGlass.g).path(in: box).boundingRect
        XCTAssertEqual(invalidStart, fallback)
    }

    func testMalformedUnsupportedAndPathologicalInputUsesHighballFallback() {
        let fallback = GlassShape(pathData: "M0 0Q1 1 2 2").path(in: box).boundingRect
        let tooManySegments = "M0 0" + String(repeating: "l1 1", count: 3_000)
        let tooLong = String(repeating: " ", count: 16_385)
        for invalid in [
            "M0 0Q1 1 2 2", "M.nan 0L1 1", "M0 0L100001 1", tooManySegments, tooLong,
        ] {
            XCTAssertEqual(GlassShape(pathData: invalid).path(in: box).boundingRect, fallback)
        }

        let liquidFallback = GlassShape(
            pathData: "M0 0Q1 1 2 2",
            fallbackPathData: DesignCatalogue.fallbackGlass.l
        ).path(in: box).boundingRect
        XCTAssertNotEqual(liquidFallback, fallback)
    }

    func testUnfittableCustomFallbackUsesBuiltInHighball() {
        let expected = GlassShape(pathData: DesignCatalogue.fallbackGlass.g).path(in: box).boundingRect
        let actual = GlassShape(
            pathData: "M0 0Q1 1 2 2",
            fallbackPathData: "M100 100L101 101"
        ).path(in: box).boundingRect

        XCTAssertEqual(actual, expected)
    }
}
