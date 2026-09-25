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
