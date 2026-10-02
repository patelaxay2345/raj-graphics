"""Import design templates from design/content (data-full.json or data.json + images) into the site.

Writes web-ready sRGB thumbnails to design/img/t/<category>/ and design/templates.js.
"""
import json, os, subprocess
from urllib.parse import unquote

ROOT = os.path.join(os.path.dirname(__file__), '..', 'design')
SRC = os.path.join(ROOT, 'content')
OUT = os.path.join(ROOT, 'img', 't')

# source category slug -> site category slug (one site category per Printers Club category)
MAP = {
    'visiting-card': 'visiting-cards',
    'die-cut-visiting-card': 'die-cut-cards',
    'letter-head': 'letter-heads',
    'envelope': 'envelopes',
    'bill-book': 'bill-books',
    'atm-pouch': 'bags',
    'doctor-files': 'files',
    'uv-texture': 'uv-texture',
    'garments-tags': 'tags',
    'sticker': 'stickers',
    'id-card': 'id-cards',
}

def thumb(src, dest):
    os.makedirs(os.path.dirname(os.path.join(ROOT, dest)), exist_ok=True)
    subprocess.run(['magick', src, '-colorspace', 'sRGB', '-strip', '-resize', '360x360>', '-quality', '74',
                    os.path.join(ROOT, dest)], check=True)

full = os.path.join(SRC, 'data-full.json')  # from crawl-templates.py, has every page
data = json.load(open(full if os.path.exists(full) else os.path.join(SRC, 'data.json')))
# images the original scrape saved, keyed by source image URL - fallback when the re-crawl got a 404
orig = json.load(open(os.path.join(SRC, 'data.json')))
saved = {unquote(d['image']): d['local_image'] for c in orig['categories']
         for d in c.get('designs', []) + [x for sc in c.get('subcategories', []) for x in sc['designs']] if d.get('local_image')}

tpl, counts = {}, {}
for c in data['categories']:
    site = MAP[c['slug']]
    cover = next((f for f in os.listdir(os.path.join(SRC, 'images', c['slug'])) if f.startswith('_cover')), None)
    if cover:
        thumb(os.path.join(SRC, 'images', c['slug'], cover), f'img/cover/{site}.jpg')
    lists = [(f"{c['name']} designs", c['designs'])] if 'designs' in c else [(s['name'].title(), s['designs']) for s in c['subcategories']]
    n = 0
    for title, designs in lists:
        items = []
        for d in designs:
            rel = d.get('local_image') or saved.get(unquote(d['image']))
            if not rel or not os.path.exists(os.path.join(SRC, rel)):
                continue
            n += 1
            dest = f"img/t/{site}/{n}.jpg"
            thumb(os.path.join(SRC, rel), dest)
            items.append([d['name'], dest])
        if items:
            tpl.setdefault(site, []).append({'g': title, 'items': items})
    counts[site] = (n, c['count'])

with open(os.path.join(ROOT, 'templates.js'), 'w') as f:
    f.write('const TPL = ' + json.dumps(tpl, ensure_ascii=False, separators=(',', ':')) + ';\n')
print(counts)
