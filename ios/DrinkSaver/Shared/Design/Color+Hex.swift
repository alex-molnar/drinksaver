import SwiftUI

struct ThemeColor: Equatable {
    let hex: UInt32
    let opacity: Double

    init(hex: UInt32, opacity: Double = 1) {
        self.hex = hex
        self.opacity = opacity
    }

    var color: Color {
        Color(
            .sRGB,
            red: Double((hex >> 16) & 0xFF) / 255,
            green: Double((hex >> 8) & 0xFF) / 255,
            blue: Double(hex & 0xFF) / 255,
            opacity: opacity
        )
    }
}

extension Color {
    init(hexString: String?, fallback: String) {
        let value = hexString ?? fallback
        let normalized = value.hasPrefix("#") ? String(value.dropFirst()) : value
        let hex = UInt32(normalized, radix: 16) ?? 0x2B1A14
        self.init(.sRGB, red: Double((hex >> 16) & 0xFF) / 255, green: Double((hex >> 8) & 0xFF) / 255,
                  blue: Double(hex & 0xFF) / 255, opacity: 1)
    }
}
