import CoreText
import XCTest
@testable import DrinkSaver

final class FontRegistrationTests: XCTestCase {
    func testEveryNamedFontRoleResolvesFromTheAppBundle() {
        for name in ["FrauncesDisplayL", "FrauncesDisplayM", "FrauncesDisplayS", "FrauncesNumeral", "FamiljenGroteskVariable"] {
            let font = CTFontCreateWithName(name as CFString, 20, nil)
            XCTAssertEqual(CTFontCopyPostScriptName(font) as String, name, "Font role \(name) did not register")
        }
    }

    func testLatinExtendedCatalogueStringsHaveGlyphOutlines() {
        let examples = ["fröccs", "rosé fröccs", "pálinka"]
        let faces = ["FrauncesDisplayL", "FrauncesDisplayM", "FrauncesDisplayS", "FamiljenGroteskVariable"]

        for face in faces {
            let font = CTFontCreateWithName(face as CFString, 20, nil)
            for example in examples {
                let characters = Array(example.utf16)
                var glyphs = [CGGlyph](repeating: 0, count: characters.count)
                let allCharactersResolved = characters.withUnsafeBufferPointer { characterBuffer in
                    glyphs.withUnsafeMutableBufferPointer { glyphBuffer in
                        CTFontGetGlyphsForCharacters(font, characterBuffer.baseAddress!, glyphBuffer.baseAddress!, characters.count)
                    }
                }
                XCTAssertTrue(allCharactersResolved, "\(face) is missing a glyph from \(example)")
                for (character, glyph) in zip(example, glyphs) where !character.isWhitespace {
                    XCTAssertNotNil(CTFontCreatePathForGlyph(font, glyph, nil), "\(face) has no outline for \(character)")
                }
            }
        }
    }
}
