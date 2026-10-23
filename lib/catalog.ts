import templates from "@/data/templates.json";

export type Category = { slug: string; name: string; img: string; days: string; m?: string; tag?: string };
export type DesignGroup = { g: string; items: string[][] };
export type Product = { t: string; img: string; group: string; f?: string; design?: boolean };

export const WA = "919800000000";

export const TPL: Record<string, DesignGroup[]> = templates;

export const CATS: Category[] = [
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

export const V: Record<string, [string, string, string?][]> = {
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

export const HOME = ["visiting-cards", "die-cut-cards", "letter-heads", "envelopes", "bill-books", "bags", "files", "uv-texture", "tags", "stickers", "id-cards"];
export const BEST: [string, string][] = [["Visiting Cards", "m-visiting"], ["Flex Banners", "m-flex"], ["Stickers", "m-stickers"], ["ID Cards", "m-idcard"], ["Brochures", "m-brochure"]];
// Placeholder testimonials — replace with real customer reviews before launch.
export const REVIEWS: [string, string, string][] = [
  ["Excellent quality and super fast delivery. Our visiting cards came out perfect!", "Amit Shah", "Small Business Owner"],
  ["Very professional service. Printing quality is top-notch and prices are very reasonable.", "Priya Patel", "Event Manager"],
  ["I have been using Raj Graphics for all our office printing needs. Highly recommended!", "Rohit Mehta", "Corporate Client"],
];

export const TPL_PAGE = 20;

export const img = (n: string) => (n.startsWith("/") ? n : `/img/${n}.jpg`);

export const waLink = (t?: string) => `https://wa.me/${WA}?text=${encodeURIComponent(t || "Hi Raj Graphics, I need a printing quote.")}`;

export const findCategory = (slug: string) => CATS.find((c) => c.slug === slug);

export const designCount = (slug: string) => TPL[slug]?.reduce((a, g) => a + g.items.length, 0) ?? 0;

const tplImg = (slug: string, j: number) => {
  const all = (TPL[slug] || []).flatMap((g) => g.items);
  return all.length ? all[Math.floor((j * all.length) / 4)][1] : undefined;
};

export const variantImg = (c: Category, im: string | undefined, j: number) => im || tplImg(c.slug, j) || c.m || c.img;

export const products = (c: Category): Product[] => {
  const designs = (TPL[c.slug] || []).flatMap((g) => g.items.map(([t, src]) => ({ t, img: src, group: g.g, design: true })));
  const variants = (V[c.slug] || []).map(([t, f, im], j) => ({ t, f, img: variantImg(c, im, j), group: `${c.name} variants` }));
  return [...designs, ...variants];
};
