import templates from "@/data/templates.json";
import type { Db } from "@/db";
import { getTableColumns } from "drizzle-orm";
import type { SQLiteTable } from "drizzle-orm/sqlite-core";
import { categories, designGroups, designs, variants } from "@/db/schema";

type SeedCategory = { slug: string; name: string; img: string; days: string; m?: string; tag?: string };

const CATS: SeedCategory[] = [
  { slug: "visiting-cards", m: "m-visiting", name: "Visiting Cards", img: "visiting", days: "1–3 days", tag: "Most popular" },
  { slug: "die-cut-cards", m: "cover/die-cut-cards", name: "Die Cut Visiting Cards", img: "v-velvet", days: "3–5 days", tag: "Unique shapes" },
  { slug: "uv-texture", m: "cover/uv-texture", name: "UV Texture Cards", img: "v-spotuv", days: "3 days" },
  { slug: "letter-heads", m: "m-letter", name: "Letter Heads", img: "letter", days: "1–3 days" },
  { slug: "envelopes", m: "m-env", name: "Envelopes", img: "env", days: "3 days" },
  { slug: "pamphlets", m: "m-poster", name: "Pamphlet / Posters", img: "poster", days: "2 days" },
  { slug: "stickers", m: "cover/stickers", name: "Stickers", img: "sticker", days: "2 days" },
  { slug: "tags", m: "m-tags", name: "Garments Tags", img: "tags", days: "3 days" },
  { slug: "files", m: "m-folder", name: "Doctor Files", img: "folder", days: "4 days" },
  { slug: "bill-books", m: "m-bill", name: "Bill Books", img: "bill", days: "3 days" },
  { slug: "bags", m: "m-pouch", name: "ATM Pouches", img: "pouch", days: "5 days" },
  { slug: "card-holders", m: "m-holder", name: "Card Holders", img: "holder", days: "3 days" },
  { slug: "pens", name: "Branded Pens", img: "pen", days: "5 days" },
  { slug: "digital", m: "m-digital", name: "Digital Paper Printing", img: "digital", days: "Same day", tag: "Fast" },
  { slug: "offset", name: "Offset Printing", img: "offset", days: "2–7 days" },
  { slug: "id-cards", m: "m-idcard", name: "ID Cards", img: "v-nfc", days: "3 days" },
  { slug: "targets", name: "Shooting Targets", img: "target", days: "3 days" },
];

const V: Record<string, [string, string, string?][]> = {
  "die-cut-cards": [["Custom Die Shape", "36+ die shapes available"], ["Metal Die-cut", "Laser-cut steel cards", "v-metal"], ["Rounded Die", "Soft corners & ovals"], ["Leaf & Badge Dies", "Creative industry shapes"]],
  "uv-texture": [["Spot UV Texture", "Raised gloss pattern on matt", "v-spotuv"], ["Full UV Texture", "Textured all-over finish"], ["UV + Foil", "Texture with gold foil", "v-foil"], ["Velvet + UV", "Soft touch with gloss", "v-velvet"]],
  "id-cards": [["PVC ID Card", "CR80 size, single or double side"], ["ID Card + Lanyard", "Printed lanyard with hook"], ["Employee ID", "Photo, name and barcode"], ["School ID", "Bulk names from Excel"]],
  "letter-heads": [["Classic Letterhead", "100 GSM bond, single/double side"], ["Premium Textured", "Laid / linen finish 120 GSM"], ["With Matching Envelope", "Complete stationery kit"], ["Wedding Stationery", "Invites, menus & place cards", "v-wedding"]],
  envelopes: [["Cloth-lined", "Strong courier envelopes"], ["Window Envelope", "DL / 10×4.5 with window"], ["Kraft Envelope", "Eco brown, custom print", "v-stationery"], ["Invitation Envelope", "Pearl & metallic sheets"]],
  pamphlets: [["A4 / A5 Flyers", "130–170 GSM art paper"], ["Tri-fold Brochure", "Glossy / matt lamination"], ["Posters", "A3 to A0, indoor & outdoor"], ["Menu Cards", "Laminated, wipe-clean"]],
  stickers: [["Die-cut Stickers", "Any shape, vinyl or paper"], ["Roll Labels", "For bottles & packaging"], ["Transparent Stickers", "Clear vinyl, white ink"], ["QR / Barcode Labels", "Serial numbered"]],
  tags: [["Garment Tags", "350 GSM with string"], ["Kraft Tags", "Eco, foil or 1-colour"], ["Price Tags", "Perforated, numbered"], ["Gift Tags", "Die-cut, ribbon hole"]],
  files: [["Presentation Folder", "Pocket + card slot"], ["Hospital / Lab File", "Printed with flap"], ["Certificate Folder", "Foil + emboss"], ["Document Envelopes", "A4 / FS size"]],
  "bill-books": [["GST Invoice Book", "Duplicate / triplicate"], ["Carbonless NCR", "2–4 part sets, numbered"], ["Receipt Book", "Pocket size"], ["Challan Book", "Custom fields"]],
  bags: [["Kraft Paper Bags", "Twisted handle"], ["White Shopping Bags", "Matt lamination"], ["ATM / Card Pouches", "Printed sleeves"], ["Gift Pouches", "Window & foil options"]],
  "card-holders": [["Leather Holder", "Debossed logo"], ["Metal Card Case", "Laser engraved"], ["Desk Card Stand", "Acrylic / wood"], ["Corporate Gift Set", "Pen + holder combo"]],
  pens: [["Plastic Ball Pens", "Bulk, 1-colour print"], ["Metal Pens", "Laser engraved"], ["Eco Pens", "Bamboo / paper"], ["Gift Pen Sets", "Boxed with logo"]],
  digital: [["Same-day Prints", "A4 / A3 colour"], ["Short-run Booklets", "Saddle-stitch"], ["Certificates", "Variable names"], ["Photo Prints", "Glossy / matt"]],
  offset: [["Bulk Brochures", "5,000+ copies"], ["Magazines & Catalogues", "Perfect bound"], ["Packaging Boxes", "Mono carton"], ["Custom Job", "Share your spec"]],
  targets: [["10m Air Rifle", "ISSF size"], ["Pistol Targets", "25m / 50m"], ["Practice Sheets", "Bulk packs"], ["Custom Target", "Your layout"]],
};

const HOME = ["visiting-cards", "die-cut-cards", "letter-heads", "envelopes", "bill-books", "bags", "files", "uv-texture", "tags", "stickers", "id-cards"];

const TPL: Record<string, { g: string; items: string[][] }[]> = templates;

const key = (n: string) => (n.startsWith("/img/") ? n.slice(5) : `${n}.jpg`);

// D1 allows at most 100 bound parameters per statement.
const chunk = <T,>(table: SQLiteTable, rows: T[]) => {
  const size = Math.floor(100 / Object.keys(getTableColumns(table)).length);
  return Array.from({ length: Math.ceil(rows.length / size) }, (_, i) => rows.slice(i * size, (i + 1) * size));
};

export function catalogRows() {
  const cats = CATS.map((c, i) => ({
    id: i + 1,
    slug: c.slug,
    name: c.name,
    turnaround: c.days,
    tag: c.tag ?? null,
    mockupKey: c.m ? key(c.m) : null,
    coverKey: key(c.img),
    sort: i,
    showOnHome: HOME.includes(c.slug),
    homeSort: Math.max(HOME.indexOf(c.slug), 0),
  }));
  const vars = cats.flatMap((c) => (V[c.slug] ?? []).map(([title, feature, im], sort) => ({ categoryId: c.id, title, feature, imageKey: im ? key(im) : null, sort })));
  const groups = cats.flatMap((c) => (TPL[c.slug] ?? []).map((g, sort) => ({ categoryId: c.id, title: g.g, sort, items: g.items })));
  const groupRows = groups.map((g, i) => ({ id: i + 1, categoryId: g.categoryId, title: g.title, sort: g.sort }));
  const designRows = groups.flatMap((g, i) => g.items.map(([code, src], sort) => ({ groupId: i + 1, code, imageKey: key(src), sort })));
  return { cats, vars, groups: groupRows, designs: designRows };
}

export async function seedCatalog(db: Db) {
  if (await db.$count(categories)) throw new Error("categories table is not empty; refusing to seed");
  const r = catalogRows();
  const [first, ...rest] = [
    ...chunk(categories, r.cats).map((rows) => db.insert(categories).values(rows)),
    ...chunk(variants, r.vars).map((rows) => db.insert(variants).values(rows)),
    ...chunk(designGroups, r.groups).map((rows) => db.insert(designGroups).values(rows)),
    ...chunk(designs, r.designs).map((rows) => db.insert(designs).values(rows)),
  ];
  await db.batch([first, ...rest]);
  return { categories: r.cats.length, variants: r.vars.length, groups: r.groups.length, designs: r.designs.length };
}
