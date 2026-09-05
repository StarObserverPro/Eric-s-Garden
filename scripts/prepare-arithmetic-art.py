"""Derive runtime symbols from the supplied, unmodified Drive contact sheets.
No fonts, rasterization, network access or runtime parsing. Run with Python 3.
"""
from copy import deepcopy
from pathlib import Path
from xml.etree import ElementTree as ET
import hashlib
import json

ROOT = Path(__file__).resolve().parents[1] / 'src/ui/art/arithmetic-r1'
NS = 'http://www.w3.org/2000/svg'
ET.register_namespace('', NS)

def tag(name):
    return '{' + NS + '}' + name

def groups(name):
    root = ET.parse(ROOT / 'source' / name).getroot()
    parent = next(g for g in root.findall(tag('g')) if g.find(tag('g')) is not None)
    return parent, parent.findall(tag('g'))

sprite = ET.Element(tag('svg'))
def symbol(name, box, parent, group, remove_card=False):
    out = ET.SubElement(sprite, tag('symbol'), {'id': name, 'viewBox': box})
    artwork = ET.SubElement(out, tag('g'), dict(parent.attrib))
    for item in group:
        if remove_card and item.tag == tag('rect'):
            continue
        artwork.append(deepcopy(item))
    return artwork

parent, items = groups('arithmetic_crop_badges.svg')
for name, item in zip(['carrot','tomato','corn','pumpkin','lettuce','strawberry'], items):
    symbol('crop-' + name, '10 8 132 184', parent, item, True)
parent, items = groups('arithmetic_operator_tokens.svg')
for name, item in zip(['plus','minus','multiply','divide','equals'], items):
    artwork = symbol('op-' + name, '-3 -3 156 152', parent, item)
    if name == 'divide':
        # Source contact sheet incorrectly drew two bars + one decorative dot.
        # Repair ONLY this derivative: a bar between two centered dots.
        for child in list(artwork)[1:]:
            artwork.remove(child)
        ET.SubElement(artwork, tag('path'), {'d':'M42 73h66','stroke':'#6d5522','stroke-width':'12','stroke-linecap':'round'})
        for y in ['44','102']:
            ET.SubElement(artwork, tag('circle'), {'cx':'75','cy':y,'r':'9','fill':'#6d5522','stroke':'none'})
parent, items = groups('arithmetic_feedback_icons.svg')
for name, item in zip(['correct','retry','water','star','seed','basket'], items):
    symbol('feedback-' + name, '0 36 160 160', parent, item)
# Native text overlays the original numeral-card geometry, so multi-digit values
# remain real selectable/readable numbers rather than an inaccessible bitmap.
parent, items = groups('arithmetic_number_tiles.svg')
out = ET.SubElement(sprite, tag('symbol'), {'id':'number-tile','viewBox':'-3 -3 110 152'})
g = ET.SubElement(out, tag('g'), dict(parent.attrib))
for child in items[0]:
    if child.tag != tag('text'):
        g.append(deepcopy(child))
ET.indent(sprite)
(ROOT / 'runtime.svg').write_text(ET.tostring(sprite, encoding='unicode') + '\n')
manifest = {
    'sourceFolder': 'https://drive.google.com/drive/folders/1aTr5TTzBJolMV9UrmwNt0p2z-tAY8smX',
    'sourceArchive': '1A8gUO-oOI9TUcrb-Hrce4lJOtqVZNA85',
    'authorship': 'Project-authored Arithmetic Art R1 supplied by the user; no third-party assets or fonts.',
    'sourceSha256': {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted((ROOT/'source').glob('*.svg'))},
    'runtimeSha256': hashlib.sha256((ROOT/'runtime.svg').read_bytes()).hexdigest(),
    'derivations': ['Remove contact-sheet placement and crop-card backgrounds; retain authored crop paths.',
                    'Crop feedback circles without contact-sheet labels. The droplet is used for watering, not as a hint.',
                    'Correct division to one bar and two centered dots; keep original contact sheet unchanged.',
                    'Use original numeral-card geometry with native text for accessible variable values.']
}
(ROOT/'provenance.json').write_text(json.dumps(manifest, indent=2) + '\n')
print('Wrote', ROOT/'runtime.svg')
