"""Regenerate the compatible full-glyph PDF copy from the original Zilla Slab font.

One-time developer command:
    python -m pip install fonttools
    python scripts/normalize-zilla.py

Requires no Python at web-app runtime. This uses fontTools to rewrite the
TrueType tables in canonical form; it does not subset the font.
"""
from pathlib import Path
from fontTools.ttLib import TTFont

root = Path(__file__).resolve().parents[1]
original = root / "fonts" / "ZillaSlab-Bold.ttf"
normalized = root / "fonts" / "ZillaSlab-Bold-pdf.ttf"

font = TTFont(original)
glyphs = font["maxp"].numGlyphs
font.save(normalized, reorderTables=True)
check = TTFont(normalized)
if check["maxp"].numGlyphs != glyphs:
    raise RuntimeError("Normalization unexpectedly changed the glyph count")
print(f"Normalized {glyphs} glyphs into {normalized.name}")
