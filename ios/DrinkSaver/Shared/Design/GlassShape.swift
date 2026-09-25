import SwiftUI
import CoreGraphics

struct GlassShape: Shape {
    let pathData: String
    let fallbackPathData: String

    init(pathData: String, fallbackPathData: String = DesignCatalogue.fallbackGlass.g) {
        self.pathData = pathData
        self.fallbackPathData = fallbackPathData
    }

    func path(in rect: CGRect) -> Path {
        guard rect.width > 0, rect.height > 0, rect.minX.isFinite, rect.minY.isFinite,
              rect.width.isFinite, rect.height.isFinite else { return Path() }
        if let parsed = SVGPathParser.parse(pathData), let fitted = Self.fit(parsed, in: rect) {
            return fitted
        }
        guard let fallback = SVGPathParser.parse(fallbackPathData)
                ?? SVGPathParser.parse(DesignCatalogue.fallbackGlass.g) else { return Path() }
        return Self.fit(fallback, in: rect) ?? Path()
    }

    private static func fit(_ path: CGPath, in rect: CGRect) -> Path? {
        let bounds = path.boundingBoxOfPath
        guard !bounds.isEmpty, bounds.width > 0, bounds.height > 0 else { return nil }
        let scale = min(rect.width / bounds.width, rect.height / bounds.height)
        guard scale.isFinite, scale > 0 else { return nil }
        let x = rect.minX + (rect.width - bounds.width * scale) / 2
        let y = rect.minY + (rect.height - bounds.height * scale) / 2
        var transform = CGAffineTransform(translationX: x, y: y)
            .scaledBy(x: scale, y: scale)
            .translatedBy(x: -bounds.minX, y: -bounds.minY)
        guard let fitted = path.copy(using: &transform) else { return nil }
        return Path(fitted)
    }
}

private struct SVGPathParser {
    private static let maximumLength = 16_384
    private static let maximumSegments = 2_048
    private static let maximumCoordinate = 100_000.0

    private var characters: [Character]
    private var index = 0
    private var path = CGMutablePath()
    private var current = CGPoint.zero
    private var subpathStart: CGPoint?
    private var previousControl: CGPoint?
    private var previousWasCubic = false
    private var segmentCount = 0

    private init(_ data: String) {
        characters = Array(data)
    }

    static func parse(_ data: String) -> CGPath? {
        guard !data.isEmpty, data.utf8.count <= maximumLength else { return nil }
        var parser = SVGPathParser(data)
        return parser.parse()
    }

    private mutating func parse() -> CGPath? {
        var command: Character?
        while true {
            skipSeparators()
            if index == characters.count { break }
            if isLetter(characters[index]) {
                command = characters[index]
                index += 1
            } else if command == nil {
                return nil
            }

            guard var active = command, "MmLlHhVvCcSsAaZz".contains(active) else { return nil }
            if active == "Z" || active == "z" {
                guard let start = subpathStart else { return nil }
                path.closeSubpath()
                current = start
                previousControl = nil
                previousWasCubic = false
                command = nil
                continue
            }

            var groupCount = 0
            while true {
                skipSeparators()
                if index == characters.count || isLetter(characters[index]) { break }
                guard segmentCount < Self.maximumSegments,
                      let values = readArguments(for: active) else { return nil }
                groupCount += 1
                segmentCount += 1
                guard apply(active, values: values) else { return nil }
                if active == "M" { active = "L"; command = active }
                if active == "m" { active = "l"; command = active }
            }
            guard groupCount > 0 else { return nil }
        }

        let bounds = path.boundingBoxOfPath
        guard !bounds.isNull, !bounds.isEmpty,
              bounds.minX.isFinite, bounds.minY.isFinite,
              bounds.maxX.isFinite, bounds.maxY.isFinite,
              abs(bounds.minX) <= Self.maximumCoordinate, abs(bounds.minY) <= Self.maximumCoordinate,
              abs(bounds.maxX) <= Self.maximumCoordinate, abs(bounds.maxY) <= Self.maximumCoordinate else { return nil }
        return path.copy()
    }

    private mutating func readArguments(for command: Character) -> [Double]? {
        let count: Int
        switch command.uppercased() {
        case "M", "L": count = 2
        case "H", "V": count = 1
        case "C": count = 6
        case "S": count = 4
        case "A": count = 7
        default: return nil
        }
        var values: [Double] = []
        values.reserveCapacity(count)
        for _ in 0..<count {
            skipSeparators()
            guard let value = readNumber(), abs(value) <= Self.maximumCoordinate else { return nil }
            values.append(value)
        }
        return values
    }

    private mutating func apply(_ command: Character, values: [Double]) -> Bool {
        let relative = command.isLowercase
        if command.uppercased() != "M", subpathStart == nil { return false }
        switch command.uppercased() {
        case "M", "L":
            let point = target(values[0], values[1], relative: relative)
            guard valid(point) else { return false }
            if command.uppercased() == "M" {
                path.move(to: point)
                subpathStart = point
            } else {
                path.addLine(to: point)
            }
            current = point
            resetCurve()
        case "H":
            let point = CGPoint(x: relative ? current.x + values[0] : values[0], y: current.y)
            guard valid(point) else { return false }
            path.addLine(to: point)
            current = point
            resetCurve()
        case "V":
            let point = CGPoint(x: current.x, y: relative ? current.y + values[0] : values[0])
            guard valid(point) else { return false }
            path.addLine(to: point)
            current = point
            resetCurve()
        case "C":
            let first = target(values[0], values[1], relative: relative)
            let second = target(values[2], values[3], relative: relative)
            let end = target(values[4], values[5], relative: relative)
            guard valid(first), valid(second), valid(end) else { return false }
            path.addCurve(to: end, control1: first, control2: second)
            current = end
            previousControl = second
            previousWasCubic = true
        case "S":
            let first = previousWasCubic ? reflected(previousControl ?? current) : current
            let second = target(values[0], values[1], relative: relative)
            let end = target(values[2], values[3], relative: relative)
            guard valid(first), valid(second), valid(end) else { return false }
            path.addCurve(to: end, control1: first, control2: second)
            current = end
            previousControl = second
            previousWasCubic = true
        case "A":
            guard values[3] == 0 || values[3] == 1, values[4] == 0 || values[4] == 1 else { return false }
            let end = target(values[5], values[6], relative: relative)
            guard valid(end), appendArc(to: end, rx: abs(values[0]), ry: abs(values[1]), rotation: values[2], largeArc: values[3] == 1, sweep: values[4] == 1) else { return false }
            current = end
            resetCurve()
        default: return false
        }
        return true
    }

    private mutating func appendArc(to end: CGPoint, rx inputRX: Double, ry inputRY: Double, rotation: Double, largeArc: Bool, sweep: Bool) -> Bool {
        let rx = inputRX
        let ry = inputRY
        guard rx.isFinite, ry.isFinite, rotation.isFinite else { return false }
        if rx == 0 || ry == 0 || current == end {
            path.addLine(to: end)
            return true
        }

        let phi = rotation * .pi / 180
        let cosPhi = cos(phi)
        let sinPhi = sin(phi)
        let dx = (current.x - end.x) / 2
        let dy = (current.y - end.y) / 2
        let xPrime = cosPhi * dx + sinPhi * dy
        let yPrime = -sinPhi * dx + cosPhi * dy
        let radiiScale = xPrime * xPrime / (rx * rx) + yPrime * yPrime / (ry * ry)
        let correctedRX = rx * sqrt(max(1, radiiScale))
        let correctedRY = ry * sqrt(max(1, radiiScale))
        let numerator = max(0, correctedRX * correctedRX * correctedRY * correctedRY
            - correctedRX * correctedRX * yPrime * yPrime - correctedRY * correctedRY * xPrime * xPrime)
        let denominator = correctedRX * correctedRX * yPrime * yPrime + correctedRY * correctedRY * xPrime * xPrime
        guard denominator > 0 else { return false }
        let sign = largeArc == sweep ? -1.0 : 1.0
        let factor = sign * sqrt(numerator / denominator)
        let cxPrime = factor * correctedRX * yPrime / correctedRY
        let cyPrime = factor * -correctedRY * xPrime / correctedRX
        let cx = cosPhi * cxPrime - sinPhi * cyPrime + (current.x + end.x) / 2
        let cy = sinPhi * cxPrime + cosPhi * cyPrime + (current.y + end.y) / 2
        let ux = (xPrime - cxPrime) / correctedRX
        let uy = (yPrime - cyPrime) / correctedRY
        let vx = (-xPrime - cxPrime) / correctedRX
        let vy = (-yPrime - cyPrime) / correctedRY
        var startAngle = atan2(uy, ux)
        var delta = atan2(ux * vy - uy * vx, ux * vx + uy * vy)
        if !sweep && delta > 0 { delta -= 2 * .pi }
        if sweep && delta < 0 { delta += 2 * .pi }
        let pieceCount = Int(ceil(abs(delta) / (.pi / 2)))
        guard pieceCount > 0, pieceCount <= 4,
              segmentCount + pieceCount - 1 <= Self.maximumSegments else { return false }
        segmentCount += pieceCount - 1
        let step = delta / Double(pieceCount)

        for _ in 0..<pieceCount {
            let next = startAngle + step
            let alpha = 4.0 / 3.0 * tan((next - startAngle) / 4)
            let p1 = ellipsePoint(cx, cy, correctedRX, correctedRY, cosPhi, sinPhi, startAngle)
            let p2 = ellipsePoint(cx, cy, correctedRX, correctedRY, cosPhi, sinPhi, next)
            let d1 = ellipseDerivative(correctedRX, correctedRY, cosPhi, sinPhi, startAngle)
            let d2 = ellipseDerivative(correctedRX, correctedRY, cosPhi, sinPhi, next)
            let control1 = CGPoint(x: p1.x + alpha * d1.x, y: p1.y + alpha * d1.y)
            let control2 = CGPoint(x: p2.x - alpha * d2.x, y: p2.y - alpha * d2.y)
            guard valid(control1), valid(control2), valid(p2) else { return false }
            path.addCurve(to: p2, control1: control1, control2: control2)
            startAngle = next
        }
        return true
    }

    private func ellipsePoint(_ cx: Double, _ cy: Double, _ rx: Double, _ ry: Double, _ cosPhi: Double, _ sinPhi: Double, _ angle: Double) -> CGPoint {
        CGPoint(x: cx + rx * cosPhi * cos(angle) - ry * sinPhi * sin(angle), y: cy + rx * sinPhi * cos(angle) + ry * cosPhi * sin(angle))
    }

    private func ellipseDerivative(_ rx: Double, _ ry: Double, _ cosPhi: Double, _ sinPhi: Double, _ angle: Double) -> CGPoint {
        CGPoint(x: -rx * cosPhi * sin(angle) - ry * sinPhi * cos(angle), y: -rx * sinPhi * sin(angle) + ry * cosPhi * cos(angle))
    }

    private func target(_ x: Double, _ y: Double, relative: Bool) -> CGPoint {
        CGPoint(x: relative ? current.x + x : x, y: relative ? current.y + y : y)
    }

    private func reflected(_ point: CGPoint) -> CGPoint {
        CGPoint(x: 2 * current.x - point.x, y: 2 * current.y - point.y)
    }

    private func valid(_ point: CGPoint) -> Bool {
        point.x.isFinite && point.y.isFinite && abs(point.x) <= Self.maximumCoordinate && abs(point.y) <= Self.maximumCoordinate
    }

    private mutating func resetCurve() {
        previousControl = nil
        previousWasCubic = false
    }

    private mutating func readNumber() -> Double? {
        let start = index
        if index < characters.count, characters[index] == "+" || characters[index] == "-" { index += 1 }
        var digits = 0
        while index < characters.count, characters[index].isNumber { digits += 1; index += 1 }
        if index < characters.count, characters[index] == "." {
            index += 1
            while index < characters.count, characters[index].isNumber { digits += 1; index += 1 }
        }
        guard digits > 0 else { index = start; return nil }
        if index < characters.count, characters[index] == "e" || characters[index] == "E" {
            index += 1
            if index < characters.count, characters[index] == "+" || characters[index] == "-" { index += 1 }
            let exponentStart = index
            while index < characters.count, characters[index].isNumber { index += 1 }
            guard index > exponentStart else { index = start; return nil }
        }
        let value = Double(String(characters[start..<index]))
        guard let value, value.isFinite else { index = start; return nil }
        return value
    }

    private mutating func skipSeparators() {
        while index < characters.count, characters[index].isWhitespace || characters[index] == "," { index += 1 }
    }

    private func isLetter(_ character: Character) -> Bool {
        character.isASCII && character.isLetter
    }
}
