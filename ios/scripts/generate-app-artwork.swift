import AppKit
import Foundation

guard CommandLine.arguments.count == 3 else {
    fatalError("Usage: generate-app-artwork <source.svg> <Assets.xcassets>")
}

let sourceURL = URL(fileURLWithPath: CommandLine.arguments[1])
let assetsURL = URL(fileURLWithPath: CommandLine.arguments[2], isDirectory: true)
let markURL = assetsURL.appendingPathComponent("DrinkSaverMark.imageset", isDirectory: true)
let iconURL = assetsURL.appendingPathComponent("AppIcon.appiconset", isDirectory: true)

guard let mark = NSImage(contentsOf: sourceURL), mark.size.width > 0, mark.size.height > 0 else {
    fatalError("Could not load the source SVG at \(sourceURL.path)")
}

func renderPNG(size: Int, background: NSColor?, logoScale: CGFloat) throws -> Data {
    guard let bitmap = NSBitmapImageRep(
        bitmapDataPlanes: nil,
        pixelsWide: size,
        pixelsHigh: size,
        bitsPerSample: 8,
        samplesPerPixel: 4,
        hasAlpha: true,
        isPlanar: false,
        colorSpaceName: .deviceRGB,
        bytesPerRow: 0,
        bitsPerPixel: 0
    ), let context = NSGraphicsContext(bitmapImageRep: bitmap) else {
        fatalError("Could not allocate \(size)x\(size) artwork")
    }

    NSGraphicsContext.saveGraphicsState()
    defer { NSGraphicsContext.restoreGraphicsState() }
    NSGraphicsContext.current = context
    context.cgContext.clear(CGRect(x: 0, y: 0, width: size, height: size))
    if let background {
        background.setFill()
        NSRect(x: 0, y: 0, width: size, height: size).fill()
    }
    let side = CGFloat(size) * logoScale
    let frame = NSRect(x: (CGFloat(size) - side) / 2, y: (CGFloat(size) - side) / 2, width: side, height: side)
    mark.draw(in: frame, from: .zero, operation: .sourceOver, fraction: 1)
    guard let data = bitmap.representation(using: .png, properties: [:]) else {
        fatalError("Could not encode artwork as PNG")
    }
    return data
}

try FileManager.default.createDirectory(at: markURL, withIntermediateDirectories: true)
try FileManager.default.createDirectory(at: iconURL, withIntermediateDirectories: true)
try renderPNG(size: 768, background: nil, logoScale: 1).write(to: markURL.appendingPathComponent("DrinkSaverMark.png"))
try renderPNG(
    size: 1024,
    background: NSColor(srgbRed: 0x23 / 255, green: 0x15 / 255, blue: 0x12 / 255, alpha: 1),
    logoScale: 1.24
).write(to: iconURL.appendingPathComponent("AppIcon.png"))
