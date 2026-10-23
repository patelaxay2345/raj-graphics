export type ServiceId = "vc" | "inv" | "ad" | "pam" | "oth";
export type SpecField = { key: string; label: string; options?: string[]; long?: boolean; placeholder?: string };
export type Service = { id: ServiceId; label: string; hsn: string; unit: string; fields: SpecField[] };

const PAPER_SIDES = ["Both sides", "Single side"];

export const SERVICES: Service[] = [
  {
    id: "vc", label: "Visiting card", hsn: "4911", unit: "pcs",
    fields: [
      { key: "size", label: "Card size", options: ["3.5 × 2 in (standard)", "3.5 × 2 in rounded", "Square 2.5 in", "Custom"] },
      { key: "paper", label: "Paper", options: ["350 GSM art card", "400 GSM art card", "300 GSM textured", "Metallic / pearl", "PVC"] },
      { key: "sides", label: "Sides", options: PAPER_SIDES },
      { key: "finish", label: "Finish", options: ["Matt lamination", "Gloss lamination", "Velvet lamination", "UV spot", "No finish"] },
      { key: "design", label: "Design", placeholder: "e.g. VC-14 from catalog" },
      { key: "names", label: "Names / variants", placeholder: "1" },
    ],
  },
  {
    id: "inv", label: "Invitation card", hsn: "4909", unit: "pcs",
    fields: [
      { key: "occasion", label: "Occasion", options: ["Wedding", "Engagement", "Birthday", "Griha pravesh", "Religious / puja", "Other"] },
      { key: "eventDate", label: "Event date", placeholder: "e.g. 08 Dec 2026" },
      { key: "language", label: "Language", options: ["Gujarati", "Hindi", "English", "Bilingual"] },
      { key: "size", label: "Card size", options: ["5 × 7 in", "6 × 8 in", "4 × 6 in", "Scroll / custom"] },
      { key: "paper", label: "Paper", options: ["300 GSM metallic", "350 GSM art card", "Handmade paper", "Shimmer"] },
      { key: "inserts", label: "Inserts", options: ["Single card", "Card + 1 insert", "Card + 2 inserts"] },
      { key: "finish", label: "Finish", options: ["Gold foil", "Emboss", "Laser cut", "UV spot", "Plain"] },
      { key: "envelope", label: "Envelope", options: ["With printed envelope", "With plain envelope", "No envelope"] },
      { key: "proofs", label: "Proof copies", placeholder: "1" },
      { key: "matter", label: "Matter on card (names, venue, family names)", long: true },
    ],
  },
  {
    id: "ad", label: "Newspaper ad", hsn: "998363", unit: "insertion",
    fields: [
      { key: "newspaper", label: "Newspaper" },
      { key: "edition", label: "Edition", options: ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "All Gujarat"] },
      { key: "adType", label: "Ad type", options: ["Classified – text", "Classified – display", "Display ad", "Obituary / shraddhanjali", "Public notice"] },
      { key: "size", label: "Size", placeholder: "e.g. 4 col × 8 cm" },
      { key: "colour", label: "Colour", options: ["Black & white", "Colour"] },
      { key: "publish", label: "Publish date(s)" },
      { key: "bookingRef", label: "Paper booking ref", placeholder: "After booking" },
      { key: "matter", label: "Ad matter", long: true, placeholder: "Exact wording. Word count drives classified price." },
    ],
  },
  {
    id: "pam", label: "Pamphlet / poster", hsn: "4911", unit: "pcs",
    fields: [
      { key: "size", label: "Size", options: ["A4", "A5", "A3", "1/8 Demy", "Custom"] },
      { key: "paper", label: "Paper", options: ["90 GSM maplitho", "130 GSM art paper", "170 GSM art paper", "300 GSM art card"] },
      { key: "colour", label: "Colour", options: ["4 colour", "2 colour", "1 colour"] },
      { key: "sides", label: "Sides", options: PAPER_SIDES },
      { key: "folding", label: "Folding", options: ["No fold", "Half fold", "Tri-fold"] },
    ],
  },
  {
    id: "oth", label: "Other printing", hsn: "4911", unit: "pcs",
    fields: [
      { key: "product", label: "Product", options: ["Letter Heads", "Envelopes", "Bill Books", "Stickers", "ID Cards", "Garment Tags", "Doctor Files", "Other"] },
      { key: "size", label: "Size" },
      { key: "material", label: "Material / paper" },
      { key: "description", label: "Job description", long: true, placeholder: "Copies, numbering, binding, perforation…" },
    ],
  },
];

export const service = (id: ServiceId) => SERVICES.find((s) => s.id === id)!;

export const UNITS = ["pcs", "sets", "books", "insertion", "sq. cm"];
export const GST_RATES = [18, 12, 5, 0];
export const DELIVERY = [["pickup", "Shop pickup"], ["delivery", "Our delivery"], ["courier", "Courier"]] as const;
export const DESIGN_BY = [["we", "We design"], ["customer", "Customer gives print-ready file"], ["edit", "Edit customer file"]] as const;
export const PROOF_BY = [["whatsapp", "WhatsApp"], ["email", "Email"], ["in-person", "In person"]] as const;
export const PAY_MODES = [["upi", "UPI"], ["cash", "Cash"], ["bank", "Bank"], ["cheque", "Cheque"]] as const;

export const orderNo = (no: number) => `ORD-${String(no).padStart(4, "0")}`;

export function toPaise(rupees: string) {
  const m = rupees.trim().replace(/,/g, "").match(/^(\d{1,9})(?:\.(\d{1,2}))?$/);
  return m ? Number(m[1]) * 100 + Number((m[2] ?? "").padEnd(2, "0")) : null;
}

export const toRupees = (paise: number) => (paise % 100 ? (paise / 100).toFixed(2) : String(paise / 100));

const INR = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2 });
export const inr = (paise: number) => INR.format(paise / 100);

export function totals(items: { qty: number; rate: number }[], gstRate: number, advance: number) {
  const subtotal = items.reduce((a, i) => a + i.qty * i.rate, 0);
  const tax = Math.round((subtotal * gstRate) / 100);
  const total = subtotal + tax;
  return { subtotal, tax, total, balance: Math.max(0, total - advance) };
}

export const payState = (total: number, advance: number) => (total > 0 && advance >= total ? "paid" : advance > 0 ? "advance" : "unpaid");

export function jobSummary(item: { service: ServiceId; specs: Record<string, string> }) {
  const s = service(item.service);
  const title = item.service === "oth" && item.specs.product && item.specs.product !== "Other" ? item.specs.product : s.label;
  const spec = s.fields.filter((f) => !f.long && f.key !== "product" && item.specs[f.key]).map((f) => item.specs[f.key]).join(" · ");
  return { title, spec };
}

export function normalizePhone(raw: string) {
  const d = raw.replace(/\D/g, "");
  const n = d.length === 10 ? `91${d}` : d.length === 11 && d.startsWith("0") ? `91${d.slice(1)}` : d;
  return /^\d{11,13}$/.test(n) ? n : null;
}

export const showPhone = (p: string) => (p.startsWith("91") && p.length === 12 ? `+91 ${p.slice(2, 7)} ${p.slice(7)}` : `+${p}`);

type MessageOrder = { no: number; total: number; advance: number; dueOn: string | null; deliveryMode: string; customer: { name: string; phone: string }; items: { service: ServiceId; specs: Record<string, string> }[] };

const day = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });

export function orderMessage(o: MessageOrder, kind: "placed" | "done") {
  const job = o.items.map((i) => jobSummary(i).title).join(", ");
  const balance = Math.max(0, o.total - o.advance);
  const lines =
    kind === "placed"
      ? [`Hello ${o.customer.name}, thank you for your order ${orderNo(o.no)} (${job}).`, `Total ${inr(o.total)}${o.advance ? ` · advance ${inr(o.advance)}` : ""} · balance ${inr(balance)}.`, o.dueOn ? `Expected ready by ${day(o.dueOn)}.` : ""]
      : [`Hello ${o.customer.name}, your order ${orderNo(o.no)} (${job}) is ready${o.deliveryMode === "pickup" ? " for pickup" : " and will be dispatched soon"}.`, balance ? `Balance to pay: ${inr(balance)}.` : ""];
  return `https://wa.me/${o.customer.phone}?text=${encodeURIComponent([...lines.filter(Boolean), "— Raj Graphics"].join("\n"))}`;
}
