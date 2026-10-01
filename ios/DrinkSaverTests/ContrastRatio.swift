import Foundation
@testable import DrinkSaver

/// WCAG contrast ratio of `fg` (alpha blended over `bg` by its opacity) against `bg`.
func contrastRatio(_ fg: ThemeColor, _ bg: ThemeColor) -> Double {
    func ch(_ h: UInt32, _ shift: UInt32) -> Double { Double((h >> shift) & 0xFF) }
    func lum(_ c: [Double]) -> Double {
        let l = c.map { v -> Double in let s = v / 255; return s <= 0.03928 ? s / 12.92 : pow((s + 0.055) / 1.055, 2.4) }
        return 0.2126 * l[0] + 0.7152 * l[1] + 0.0722 * l[2]
    }
    let back = [ch(bg.hex, 16), ch(bg.hex, 8), ch(bg.hex, 0)]
    let front = [ch(fg.hex, 16), ch(fg.hex, 8), ch(fg.hex, 0)].enumerated().map { $1 * fg.opacity + back[$0] * (1 - fg.opacity) }
    let a = lum(front), b = lum(back)
    return (max(a, b) + 0.05) / (min(a, b) + 0.05)
}
