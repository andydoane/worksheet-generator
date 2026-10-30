#!/usr/bin/env python3
"""One-time/reproducible instantiation of the licensed Nunito Sans variable TTF.

Run with fontTools installed:
  python scripts/generate_nunito.py

Commits are reviewed as part of PR 10b+c; no font is fetched from the web.
"""
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

ROOT=Path(__file__).resolve().parent.parent
SOURCE=ROOT/'fonts'/'NunitoSans-VariableFont_YTLC,opsz,wdth,wght.ttf'
FACES=[(600,'SemiBold'),(750,'ExtraBold'),(900,'Black')]
for weight,style in FACES:
    font=TTFont(SOURCE)
    axes={a.axisTag:a.defaultValue for a in font['fvar'].axes}
    axes['wght']=weight
    static=instantiateVariableFont(font,axes,inplace=False,optimize=True)
    if 'fvar' in static or 'gvar' in static:
        raise ValueError('Expected a fully static TrueType instance')
    names={
        1:'Nunito Sans',
        2:style,
        3:f'NunitoSans-{weight}',
        4:f'Nunito Sans {style}',
        6:f'NunitoSans-{weight}',
        16:'Nunito Sans',
        17:style,
    }
    name_table=static['name']
    for nameID,value in names.items():
        name_table.setName(value,nameID,3,1,0x409)
        name_table.setName(value,nameID,1,0,0)
    static['OS/2'].usWeightClass=weight
    out=ROOT/'fonts'/f'NunitoSans-{weight}.ttf'
    static.save(out)
    verified=TTFont(out)
    assert 'fvar' not in verified and 'gvar' not in verified
    print(f'Wrote {out.name}: {out.stat().st_size:,} bytes (wght={weight})')
