import type { Seller } from "@/db/schema";
import "./invoice-doc.css";

export type ChallanDocData = {
  no: string | null;
  issuedOn: string | null;
  orderNo: string;
  seller: Seller;
  deliverTo: string;
  phone: string;
  address: string;
  vehicle: string;
  purpose: string;
  returnable: boolean;
  items: { description: string; qty: number; unit: string; packing: string }[];
};

const day = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

export function ChallanDoc({ d, copy }: { d: ChallanDocData; copy: string }) {
  const s = d.seller;
  const contact = [s.address, s.phone, s.email].filter(Boolean).join(" · ");
  return (
    <article className="inv-doc" aria-label={`Delivery challan · ${copy}`}>
      <header className="inv-top">
        <div className="inv-brand">
          <img src="/logo.png" alt="" />
          <div>
            <b>{s.legalName}</b>
            {contact && <div>{contact}</div>}
            {s.gstin && <div className="inv-mono">GSTIN: {s.gstin}</div>}
          </div>
        </div>
        <div className="inv-title"><b>DELIVERY CHALLAN</b><span>{copy} · Not for sale</span></div>
      </header>

      <section className="inv-parties">
        <div>
          <span className="inv-k">Deliver to</span>
          <b>{d.deliverTo}</b>
          {d.address && <div>{d.address}</div>}
          {d.phone && <div>{d.phone}</div>}
        </div>
        <table>
          <tbody>
            <tr><td>Challan no</td><td className="inv-mono">{d.no ?? "Draft"}</td></tr>
            <tr><td>Date</td><td>{d.issuedOn ? day(d.issuedOn) : "On issue"}</td></tr>
            <tr><td>Order</td><td className="inv-mono">{d.orderNo}</td></tr>
            <tr><td>Purpose</td><td>{d.purpose}</td></tr>
            {d.vehicle && <tr><td>Vehicle / by</td><td>{d.vehicle}</td></tr>}
          </tbody>
        </table>
      </section>

      <table className="inv-lines">
        <thead><tr><th>#</th><th>Item</th><th className="r">Quantity</th><th>Packing</th></tr></thead>
        <tbody>
          {d.items.map((i, n) => (
            <tr key={n}><td>{n + 1}</td><td>{i.description}</td><td className="r">{i.qty.toLocaleString("en-IN")} {i.unit}</td><td>{i.packing}</td></tr>
          ))}
        </tbody>
      </table>
      <p className="inv-note">Returnable: {d.returnable ? "Yes" : "No"} · Received the above goods in good condition and as per the approved proof.</p>

      <footer className="inv-foot">
        <div className="inv-sign inv-recv"><div />Receiver’s signature, name &amp; date</div>
        <div className="inv-sign"><div />For {s.legalName}<br />Authorised signatory</div>
      </footer>
    </article>
  );
}
