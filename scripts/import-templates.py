"""Import design templates from design/content (data.json + images) into the site.

Writes web-ready sRGB thumbnails to design/img/t/<category>/ and design/templates.js.
"""
import json, os, subprocess

ROOT = os.path.join(os.path.dirname(__file__), '..', 'design')
SRC = os.path.join(ROOT, 'content')
OUT = os.path.join(ROOT, 'img', 't')

# source category slug -> (site category slug, group title)
MAP = {
    'visiting-card': ('visiting-cards', 'Visiting card designs'),
    'die-cut-visiting-card': ('visiting-cards', 'Die-cut designs'),
    'uv-texture': ('visiting-cards', 'UV texture designs'),
    'letter-head': ('letter-heads', 'Letterhead designs'),
    'envelope': ('envelopes', 'Envelope designs'),
    'bill-book': ('bill-books', 'Bill book designs'),
    'atm-pouch': ('bags', 'ATM pouch designs'),
    'sticker': ('stickers', 'Sticker designs'),
    'id-card': ('id-cards', 'ID card designs'),
    'garments-tags': ('tags', 'Garment tag designs'),
    'doctor-files': ('files', 'Doctor file designs'),
}

data = json.load(open(os.path.join(SRC, 'data.json')))
tpl = {}
for c in data['categories']:
    site, title = MAP[c['slug']]
    designs = [(d['name'], d.get('local_image')) for d in c.get('designs', [])]
    for s in c.get('subcategories', []):
        designs += [(f"{s['name'].title()} · {d['name']}", d.get('local_image')) for d in s['designs']]
    items = []
    for name, rel in designs:
        if not rel or not os.path.exists(os.path.join(SRC, rel)):
            continue
        dest = f"img/t/{site}/{c['slug']}-{len(items) + 1}.jpg"
        os.makedirs(os.path.dirname(os.path.join(ROOT, dest)), exist_ok=True)
        subprocess.run(['magick', os.path.join(SRC, rel), '-colorspace', 'sRGB', '-strip', '-resize', '360x360>',
                        '-quality', '74', os.path.join(ROOT, dest)], check=True)
        items.append([name, dest])
    if items:
        tpl.setdefault(site, []).append({'g': title, 'items': items})

with open(os.path.join(ROOT, 'templates.js'), 'w') as f:
    f.write('const TPL = ' + json.dumps(tpl, ensure_ascii=False, separators=(',', ':')) + ';\n')
print({k: sum(len(g['items']) for g in v) for k, v in tpl.items()})
