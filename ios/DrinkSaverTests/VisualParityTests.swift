import CoreGraphics
import Foundation
import ImageIO
import XCTest

final class VisualParityTests: XCTestCase {
    private let viewports: [(name: String, width: Int, height: Int, top: Int, bottom: Int)] = [
        ("375x667", 1125, 2001, 20, 0),
        ("375x812", 1125, 2436, 47, 34),
        ("440x956", 1320, 2868, 59, 34)
    ]
    private let states = [
        "quick-ready", "quick-loading", "quick-error", "history-populated", "history-empty",
        "history-error", "recs-ready", "recs-empty", "recs-error", "add-root"
    ]

    func testFrozenReferenceMatrixIsCompleteAndComparable() throws {
        let root = URL(fileURLWithPath: #filePath)
            .deletingLastPathComponent()
            .deletingLastPathComponent()
            .deletingLastPathComponent()
        let environment = ProcessInfo.processInfo.environment
        let webDirectory = referenceDirectory("WEB_REFERENCE_DIR", in: environment)
            ?? root.appendingPathComponent("ios/Reference/web", isDirectory: true)
        let nativeDirectory = referenceDirectory("NATIVE_REFERENCE_DIR", in: environment)
            ?? root.appendingPathComponent("ios/Reference/native", isDirectory: true)
        var report: [String] = []

        for state in states {
            for theme in ["dark", "light"] {
                for viewport in viewports {
                    let name = "\(state)-\(theme)-\(viewport.name).png"
                    let webURL = webDirectory.appendingPathComponent(name)
                    let nativeURL = nativeDirectory.appendingPathComponent(name)
                    let web = try loadPNG(webURL)
                    let native = try loadPNG(nativeURL)
                    XCTAssertEqual(web.width, viewport.width, "Unexpected frozen reference width: \(name)")
                    XCTAssertEqual(web.height, viewport.height, "Unexpected frozen reference height: \(name)")
                    XCTAssertEqual(native.width, viewport.width, "Unexpected native reference width: \(name)")
                    XCTAssertEqual(native.height, (viewport.height / 3 - viewport.top - viewport.bottom) * 3,
                                   "Unexpected native content crop height: \(name)")
                    XCTAssertEqual(web.colorSpace?.name, CGColorSpace.sRGB, "Web image must use sRGB: \(name)")
                    XCTAssertEqual(native.colorSpace?.name, CGColorSpace.sRGB, "Native image must use sRGB: \(name)")

                    let webContentRect = CGRect(
                        x: 0,
                        y: 0,
                        width: viewport.width,
                        height: native.height
                    )
                    let webContent = try XCTUnwrap(web.cropping(to: webContentRect), "Could not crop web content: \(name)")
                    let comparison = compare(webContent, native, sampleStride: 4, channelTolerance: 24)
                    XCTAssertLessThan(comparison.meanError, 24, "Large visual divergence (mean channel error \(comparison.meanError)): \(name)")
                    XCTAssertLessThan(comparison.outlierFraction, 0.12,
                                      "Geometry or color divergence (\(comparison.outlierFraction * 100)% sampled pixels): \(name)")
                    report.append("\(name): MAE \(String(format: "%.2f", comparison.meanError)), >24-channel delta \(String(format: "%.2f%%", comparison.outlierFraction * 100))")
                }
            }
        }

        let attachment = XCTAttachment(data: Data(report.joined(separator: "\n").utf8), uniformTypeIdentifier: "public.plain-text")
        attachment.name = "iOS visual parity comparison report"
        attachment.lifetime = .keepAlways
        add(attachment)
    }

    private func referenceDirectory(_ key: String, in environment: [String: String]) -> URL? {
        guard let path = environment[key], !path.contains("$(") else { return nil }
        return URL(fileURLWithPath: path, isDirectory: true)
    }

    private func loadPNG(_ url: URL, file: StaticString = #filePath, line: UInt = #line) throws -> CGImage {
        XCTAssertTrue(FileManager.default.fileExists(atPath: url.path), "Missing reference image: \(url.lastPathComponent)", file: file, line: line)
        let source = try XCTUnwrap(CGImageSourceCreateWithURL(url as CFURL, nil), "Could not read PNG: \(url.lastPathComponent)", file: file, line: line)
        return try XCTUnwrap(CGImageSourceCreateImageAtIndex(source, 0, nil), "Could not decode PNG: \(url.lastPathComponent)", file: file, line: line)
    }

    private func compare(_ lhs: CGImage, _ rhs: CGImage, sampleStride: Int, channelTolerance: Int) -> (meanError: Double, outlierFraction: Double) {
        guard lhs.width == rhs.width, lhs.height == rhs.height,
              let left = rgbaPixels(lhs), let right = rgbaPixels(rhs) else { return (.infinity, 1) }
        let bytesPerRow = lhs.width * 4
        var total = 0
        var channelCount = 0
        var pixels = 0
        var outliers = 0
        for y in stride(from: 0, to: lhs.height, by: sampleStride) {
            for x in stride(from: 0, to: lhs.width, by: sampleStride) {
                let offset = y * bytesPerRow + x * 4
                var pixelOutlier = false
                for channel in 0..<3 {
                    let delta = abs(Int(left[offset + channel]) - Int(right[offset + channel]))
                    total += delta
                    channelCount += 1
                    pixelOutlier = pixelOutlier || delta > channelTolerance
                }
                pixels += 1
                if pixelOutlier { outliers += 1 }
            }
        }
        return (Double(total) / Double(max(1, channelCount)), Double(outliers) / Double(max(1, pixels)))
    }

    private func rgbaPixels(_ image: CGImage) -> [UInt8]? {
        let bytesPerRow = image.width * 4
        var bytes = [UInt8](repeating: 0, count: bytesPerRow * image.height)
        let colorSpace = CGColorSpace(name: CGColorSpace.sRGB)!
        let bitmapInfo = CGBitmapInfo.byteOrder32Big.rawValue | CGImageAlphaInfo.premultipliedLast.rawValue
        let drawn = bytes.withUnsafeMutableBytes { buffer -> Bool in
            guard let context = CGContext(
                data: buffer.baseAddress,
                width: image.width,
                height: image.height,
                bitsPerComponent: 8,
                bytesPerRow: bytesPerRow,
                space: colorSpace,
                bitmapInfo: bitmapInfo
            ) else { return false }
            context.interpolationQuality = .none
            context.draw(image, in: CGRect(x: 0, y: 0, width: image.width, height: image.height))
            return true
        }
        return drawn ? bytes : nil
    }
}
