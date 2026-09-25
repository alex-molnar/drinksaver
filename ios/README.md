# Native iOS app

## Theme and typography

`DrinkSaverTheme.dark` and `.light` contain the frozen web token values. `ThemeStore` keeps the
manual dark/light choice in `UserDefaults` under `drinksaver-theme`; an absent or unknown value
starts dark. `PlasterBackground(theme:)` paints the ground and its one subtle noise layer behind
the root view. Feature surfaces should use the theme's flat colors instead of drawing another
noise layer. `TypeRole.font` uses Dynamic Type relative to each role's matching SwiftUI text style;
the numeral role also uses tabular digits.

The bundled Fraunces roles are static native instances at the frozen optical-size, weight,
softness, and wonk values. Familjen Grotesk stays variable over weights 400–700. The source WOFF2
files in `web/src/assets/fonts/` are never converted or shipped by iOS.

Regenerate the checked-in TrueType files with:

```sh
ios/scripts/generate-font-assets.sh
```

The script downloads sources from Google Fonts revision
`23e54b51ddffbc7713c583748e3bd86f62b1fa4a`, verifies their SHA-256 checksums, and pins
FontTools `4.58.0`. Fraunces instances use `(opsz, wght, SOFT, WONK)` values `(60, 700, 85, 1)` for
display L, `(30, 700, 85, 1)` for display M, `(28, 600, 70, 1)` for display S, and
`(90, 700, 90, 1)` for numerals. Generated fonts have a fixed OpenType timestamp and verified
output checksums in the script. The separate copyright notices and SIL Open Font License 1.1
terms are in `DrinkSaver/Resources/OFL.txt`.
