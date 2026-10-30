from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools import subset
from copy import deepcopy

source = Path("fonts/ZillaSlab-Bold.ttf")
out = Path("artifacts/zilla-candidates")
out.mkdir(parents=True, exist_ok=True)

font = TTFont(source, lazy=False)
print("Font:", source, "bytes", source.stat().st_size)
print("Font sfnt:", font.sfntVersion, "tables:", sorted(font.keys()))
print("Units", font["head"].unitsPerEm, "numGlyphs", font["maxp"].numGlyphs)
font.save(out / "resaved.ttf", reorderTables=True)

for variant, remove in [
    ("no-layout", ["GSUB", "GPOS", "GDEF", "kern"]),
    ("no-hint-tables", ["fpgm", "prep", "cvt ", "gasp"]),
    ("no-layout-or-hint", ["GSUB", "GPOS", "GDEF", "kern", "fpgm", "prep", "cvt ", "gasp"]),
]:
    f = TTFont(source)
    for table in remove:
        if table in f:
            del f[table]
    f.save(out / (variant + ".ttf"), reorderTables=True)

for variant, hinting in [("latin-subset-hinted", True), ("latin-subset-unhinted", False)]:
    f = TTFont(source)
    options = subset.Options()
    options.hinting = hinting
    options.recalc_bounds = True
    options.layout_features = []
    options.name_IDs = ['*']
    options.name_legacy = True
    options.name_languages = ['*']
    sub = subset.Subsetter(options=options)
    sub.populate(unicodes=list(range(32, 127)) + list(range(160, 384)) + [8217,8216,8220,8221,8211,8212])
    sub.subset(f)
    f.save(out / (variant + ".ttf"), reorderTables=True)
for p in out.glob("*.ttf"):
    print("Candidate", p.name, p.stat().st_size)
