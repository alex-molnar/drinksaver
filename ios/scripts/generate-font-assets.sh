#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
IOS_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
OUTPUT_DIR="$IOS_DIR/DrinkSaver/Resources/Fonts"
SOURCE_REVISION="23e54b51ddffbc7713c583748e3bd86f62b1fa4a"
FONTTOOLS_VERSION="4.58.0"
WORK_DIR="$(mktemp -d)"
trap 'rm -rf "$WORK_DIR"' EXIT

download() {
  curl --fail --location --retry 2 --silent --show-error "$1" --output "$2"
}

verify_sha256() {
  local expected="$1" file="$2"
  printf '%s  %s\n' "$expected" "$file" | shasum --algorithm 256 --check --status || {
    echo "SHA-256 mismatch for $file" >&2
    exit 1
  }
}

download "https://raw.githubusercontent.com/google/fonts/$SOURCE_REVISION/ofl/fraunces/Fraunces%5BSOFT%2CWONK%2Copsz%2Cwght%5D.ttf" "$WORK_DIR/FrauncesVariable.ttf"
download "https://raw.githubusercontent.com/google/fonts/$SOURCE_REVISION/ofl/familjengrotesk/FamiljenGrotesk%5Bwght%5D.ttf" "$WORK_DIR/FamiljenGroteskVariable.ttf"
download "https://raw.githubusercontent.com/google/fonts/$SOURCE_REVISION/ofl/fraunces/OFL.txt" "$WORK_DIR/Fraunces-OFL.txt"
download "https://raw.githubusercontent.com/google/fonts/$SOURCE_REVISION/ofl/familjengrotesk/OFL.txt" "$WORK_DIR/FamiljenGrotesk-OFL.txt"

verify_sha256 177ff6c0f14e5550a3c624247cd1189611d4eb65d000b14944c63d967958abbb "$WORK_DIR/FrauncesVariable.ttf"
verify_sha256 2d25fc41321a04561fab20a90fc8bc9ed4d1c0743fe8ba76cc51cd3632138b80 "$WORK_DIR/FamiljenGroteskVariable.ttf"
verify_sha256 bdf4c22802eaf804f998195871c6b8938aac2ac14b2d78a8bd66a6f1eced833b "$WORK_DIR/Fraunces-OFL.txt"
verify_sha256 9708dd560d1f8aa1f006461aa447a31fda7b9aff662d152837654a388e0eb2ee "$WORK_DIR/FamiljenGrotesk-OFL.txt"

mkdir -p "$OUTPUT_DIR"
{
  head -n 1 "$WORK_DIR/Fraunces-OFL.txt"
  head -n 1 "$WORK_DIR/FamiljenGrotesk-OFL.txt"
  tail -n +2 "$WORK_DIR/Fraunces-OFL.txt"
} > "$IOS_DIR/DrinkSaver/Resources/OFL.txt"

uv run --no-project --cache-dir "$WORK_DIR/uv-cache" --with "fonttools==$FONTTOOLS_VERSION" python - "$WORK_DIR" "$OUTPUT_DIR" <<'PY'
from pathlib import Path
import hashlib
import sys

from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

source_dir, output_dir = map(Path, sys.argv[1:])
output_dir.mkdir(parents=True, exist_ok=True)

roles = (
    ("FrauncesDisplayL", "Fraunces Display L", "Bold", {"opsz": 60, "wght": 700, "SOFT": 85, "WONK": 1}),
    ("FrauncesDisplayM", "Fraunces Display M", "Bold", {"opsz": 30, "wght": 700, "SOFT": 85, "WONK": 1}),
    ("FrauncesDisplayS", "Fraunces Display S", "SemiBold", {"opsz": 28, "wght": 600, "SOFT": 70, "WONK": 1}),
    ("FrauncesNumeral", "Fraunces Numeral", "Bold", {"opsz": 90, "wght": 700, "SOFT": 90, "WONK": 1}),
)

def set_names(font, family, style, postscript):
    table = font["name"]
    replacements = {
        1: family,
        2: style,
        3: f"DrinkSaver 1.0; {postscript}",
        4: f"{family} {style}",
        6: postscript,
        16: family,
        17: style,
    }
    table.names = [record for record in table.names if record.nameID not in replacements]
    for name_id, value in replacements.items():
        table.setName(value, name_id, 3, 1, 0x409)
        table.setName(value, name_id, 1, 0, 0)

def save(font, path):
    # OpenType timestamps use seconds since 1904; pin the Unix epoch and disable save-time updates.
    font.recalcTimestamp = False
    font["head"].created = 2_082_840_000
    font["head"].modified = 2_082_840_000
    if "DSIG" in font:
        del font["DSIG"]
    font.save(path, reorderTables=False)

for postscript, family, style, axes in roles:
    font = TTFont(source_dir / "FrauncesVariable.ttf")
    instantiateVariableFont(font, axes, inplace=True, optimize=True, updateFontNames=False)
    set_names(font, family, style, postscript)
    save(font, output_dir / f"{postscript}.ttf")

familjen = TTFont(source_dir / "FamiljenGroteskVariable.ttf")
set_names(familjen, "Familjen Grotesk Variable", "Regular", "FamiljenGroteskVariable")
save(familjen, output_dir / "FamiljenGroteskVariable.ttf")

expected = {
    "FrauncesDisplayL.ttf": "5bf3d4a1aff4726583150446d110e7c0fd4aea2b72d3b2dd7d43706e9a931a09",
    "FrauncesDisplayM.ttf": "0dd971238368566718bc2397dfa4ae1724ef405a88cc5f4b7b5eccf1aacb84f4",
    "FrauncesDisplayS.ttf": "b0c938b2ec8e4d8721bece3a5f15c5eb9aa1fd8b714443cc29dd4e96c18d7322",
    "FrauncesNumeral.ttf": "7747d426c1aa15ebf2ed5ec7e1c8794964f3febbf5a371134910712d48168756",
    "FamiljenGroteskVariable.ttf": "3227fed57fc5726786247200d539405ab0d5c28d02510050ef394ff5cbe67d8f",
}
for filename, checksum in expected.items():
    actual = hashlib.sha256((output_dir / filename).read_bytes()).hexdigest()
    if actual != checksum:
        raise SystemExit(f"Generated checksum mismatch for {filename}: {actual}")
    print(f"Verified {filename}: {actual}")
PY
