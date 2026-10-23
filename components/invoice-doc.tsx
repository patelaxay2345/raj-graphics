import type { Seller } from "@/db/schema";
import { invoiceTotals, rupeesInWords, stateName } from "@/lib/gst";
import { inr } from "@/lib/order-format";
import "./invoice-doc.css";

export type InvoiceDocData = {
  no: string | null;
  issuedOn: string | null;
  orderNo: string;
  seller: Seller;
  billName: string;
  billGstin: string;
  billAddress: string;
  placeOfSupply: string;
  gstRate: number;
  advance: number;
  note: string;
  items: { description: string; hsn: string; qty: number; unit: string; rate: number }[];
};

const day = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const signed = (p: number) => `${p < 0 ? "−" : "+"}${inr(Math.abs(p)).slice(1)}`;

export function InvoiceDoc({ d }: { d: InvoiceDocData }) {
  const s = d.seller;
  const intra = d.placeOfSupply === s.stateCode;
  const t = invoiceTotals(d.items, d.gstRate, intra);
  const half = d.gstRate / 2;
  const contact = [s.address, s.phone, s.email].filter(Boolean).join(" · ");

  return (
    <article className="inv-doc" aria-label="Invoice">
      <header className="inv-top">
        <div className="inv-brand">
          <img src="/logo.png" alt="" />
          <div>
            <b>{s.legalName}</b>
            {contact && <div>{contact}</div>}
            <div className="inv-mono">{s.gstin ? `GSTIN: ${s.gstin}` : "GSTIN: not set"}{s.pan && ` · PAN: ${s.pan}`}</div>
          </div>
        </div>
        <div className="inv-title"><b>TAX INVOICE</b><span>Original for recipient</span></div>
      </header>

      <section className="inv-parties">
        <div>
          <span className="inv-k">Bill to</span>
          <b>{d.billName}</b>
          {d.billAddress && <div>{d.billAddress}</div>}
          <div className="inv-mono">{d.billGstin ? `GSTIN: ${d.billGstin}` : "Unregistered (B2C)"}</div>
        </div>
        <table>
          <tbody>
            <tr><td>Invoice no</td><td className="inv-mono">{d.no ?? "Draft"}</td></tr>
            <tr><td>Date</td><td>{d.issuedOn ? day(d.issuedOn) : "On issue"}</td></tr>
            <tr><td>Order</td><td className="inv-mono">{d.orderNo}</td></tr>
            <tr><td>Place of supply</td><td>{d.placeOfSupply} – {stateName(d.placeOfSupply)}</td></tr>
          </tbody>
        </table>
      </section>

      <table className="inv-lines">
        <thead><tr><th>#</th><th>Description</th><th>HSN/SAC</th><th className="r">Qty</th><th className="r">Rate</th><th className="r">Amount</th></tr></thead>
        <tbody>
          {d.items.map((i, n) => (
            <tr key={n}><td>{n + 1}</td><td>{i.description}</td><td className="inv-mono">{i.hsn}</td><td className="r">{i.qty.toLocaleString("en-IN")} {i.unit}</td><td className="r">{inr(i.rate)}</td><td className="r">{inr(i.qty * i.rate)}</td></tr>
          ))}
        </tbody>
      </table>

      <section className="inv-sum">
        <div>
          <span className="inv-k">Amount in words</span>
          <div>{rupeesInWords(t.total)}</div>
          {(s.bankName || s.account || s.upi) && (
            <>
              <span className="inv-k">Pay to</span>
              {s.account && <div>{s.bankName} · A/c {s.account}{s.ifsc && ` · IFSC ${s.ifsc}`}</div>}
              {s.upi && <div>UPI: {s.upi}</div>}
            </>
          )}
          {d.note && <><span className="inv-k">Note</span><div>{d.note}</div></>}
        </div>
        <table>
          <tbody>
            <tr><td>Taxable value</td><td className="r">{inr(t.taxable)}</td></tr>
            {d.gstRate > 0 && (intra ? (
              <>
                <tr><td>CGST {half}%</td><td className="r">{inr(t.cgst)}</td></tr>
                <tr><td>SGST {half}%</td><td className="r">{inr(t.sgst)}</td></tr>
              </>
            ) : (
              <tr><td>IGST {d.gstRate}%</td><td className="r">{inr(t.igst)}</td></tr>
            ))}
            {t.roundOff !== 0 && <tr><td>Round off</td><td className="r">{signed(t.roundOff)}</td></tr>}
            <tr className="inv-total"><td>Total</td><td className="r">{inr(t.total)}</td></tr>
            {d.advance > 0 && <tr><td>Advance received</td><td className="r">−{inr(d.advance)}</td></tr>}
            {d.advance > 0 && <tr className="inv-total"><td>Balance due</td><td className="r">{inr(Math.max(0, t.total - d.advance))}</td></tr>}
          </tbody>
        </table>
      </section>

      <footer className="inv-foot">
        <div className="inv-terms">{s.terms && <><span className="inv-k">Terms</span>{s.terms}</>}</div>
        <div className="inv-sign"><div />For {s.legalName}<br />Authorised signatory</div>
      </footer>
    </article>
  );
}
