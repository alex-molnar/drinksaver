import SwiftUI

struct PlasterBackground: View {
    let theme: DrinkSaverTheme

    var body: some View {
        Canvas { context, size in
            let count = Int(size.width * size.height / 110)
            for index in 0..<count {
                let seed = UInt64(index) &* 2_654_435_761 &+ 1_013_904_223
                let x = CGFloat(seed % UInt64(max(1, Int(size.width))))
                let y = CGFloat((seed >> 16) % UInt64(max(1, Int(size.height))))
                let rect = CGRect(x: x, y: y, width: 1, height: 1)
                let shade = index.isMultiple(of: 2) ? Color.white : Color.black
                context.fill(Path(ellipseIn: rect), with: .color(shade.opacity(theme.texture.noiseOpacity)))
            }
        }
        .background(theme.surface.ground.color)
        .ignoresSafeArea()
        .accessibilityHidden(true)
        .allowsHitTesting(false)
    }
}
