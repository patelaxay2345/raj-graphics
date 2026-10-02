"""Re-crawl every page of each printersclub.in template listing (pages are ASP.NET postbacks).

Reads design/content/data.json for listing URLs, writes design/content/data-full.json and
downloads images into design/content/images/<category>/full/.
"""
import json, os, re, urllib.parse, urllib.request
from playwright.sync_api import sync_playwright

SRC = os.path.join(os.path.dirname(__file__), '..', 'design', 'content')
data = json.load(open(os.path.join(SRC, 'data.json')))

ITEMS_JS = """() => [...document.querySelectorAll('div.center img[src*="template-images"]')].map(i => {
  const box = i.closest('div.center'), a = box.querySelector('a.downloadButton');
  return {name: box.innerText.split('\\n').map(s => s.trim()).filter(Boolean)[0] || '', image: i.src, cdr: a ? a.href : null};
})"""

FIRST_JS = "() => document.querySelector('div.center img[src*=template-images]')?.src || ''"

def crawl(page, url):
    page.goto(url, wait_until='domcontentloaded')
    seen, out = set(), []
    while True:
        for it in page.evaluate(ITEMS_JS):
            if it['image'] not in seen:
                seen.add(it['image']); out.append(it)
        nxt = page.locator('#ctl00_ContentPlaceHolder1_btnNext')
        if not nxt.count() or nxt.is_disabled():
            return out
        first = page.evaluate(FIRST_JS)
        nxt.click()
        try:
            page.wait_for_function(f"() => ({FIRST_JS})() !== {json.dumps(first)}", timeout=45000)
        except Exception:
            print('  stuck after', len(out), 'items', flush=True)
            return out

def fetch(url, dest):
    if os.path.exists(dest):
        return True
    try:
        q = urllib.parse.quote(url, safe=':/?=&%')
        body = urllib.request.urlopen(urllib.request.Request(q, headers={'User-Agent': 'Mozilla/5.0'}), timeout=30).read()
        open(dest, 'wb').write(body)
        return True
    except Exception as e:
        print('  img fail', url, e)
        return False

with sync_playwright() as p:
    page = p.chromium.launch().new_page()
    for c in data['categories']:
        lists = [(c, c['slug'])] if 'designs' in c else [(s, f"{c['slug']}/{s['slug']}") for s in c['subcategories']]
        for node, key in lists:
            items = crawl(page, node['url'])
            d = os.path.join(SRC, 'images', c['slug'], 'full')
            os.makedirs(d, exist_ok=True)
            for n, it in enumerate(items, 1):
                ext = os.path.splitext(urllib.parse.urlparse(it['image']).path)[1].lower() or '.jpg'
                name = re.sub(r'[^a-z0-9]+', '-', key.lower()) + f'-{n}{ext}'
                it['local_image'] = f'images/{c["slug"]}/full/{name}' if fetch(it['image'], os.path.join(d, name)) else None
            node['designs'] = items
            print(key, len(items), 'expected', node.get('count'), flush=True)

json.dump(data, open(os.path.join(SRC, 'data-full.json'), 'w'), indent=1)
