"use client";

import { useState, useTransition } from "react";
import { issueAction, saveDraftAction } from "@/app/(admin)/admin/invoices/actions";
import { IconTrash } from "@/components/admin/icons";
import { InvoiceDoc, type InvoiceDocData } from "@/components/invoice-doc";
import type { DraftInput } from "@/lib/admin-invoices";
import { STATES } from "@/lib/gst";
import { GST_RATES, UNITS, toPaise } from "@/lib/order-format";

type Line = DraftInput["items"][number] & { key: number };

let nextKey = 0;
const paise = (v: string) => toPaise(v) ?? 0;
const count = (v: string) => (/^\d+$/.test(v.trim()) ? Number(v) : 0);

export function InvoiceEditor({ id, initial, doc }: { id: number; initial: DraftInput; doc: Omit<InvoiceDocData, "billName" | "billGstin" | "billAddress" | "placeOfSupply" | "gstRate" | "advance" | "note" | "items"> }) {
  const [d, setD] = useState(() => ({ ...initial, items: undefined }));
  const [lines, setLines] = useState<Line[]>(() => initial.items.map((i) => ({ ...i, key: nextKey++ })));
  const [msg, setMsg] = useState<{ error?: string; saved?: boolean }>({});
  const [pending, start] = useTransition();

  const set = <K extends keyof typeof d>(k: K, v: (typeof d)[K]) => setD((x) => ({ ...x, [k]: v }));
  const patch = (key: number, p: Partial<Line>) => setLines((l) => l.map((x) => (x.key === key ? { ...x, ...p } : x)));
  const input = (): DraftInput => ({ ...d, items: lines.map((l) => ({ description: l.description, hsn: l.hsn, qty: l.qty, unit: l.unit, rate: l.rate })) });

  const run = (fn: () => Promise<{ error?: string }>, ok?: string) =>
    start(async () => {
      setMsg({});
      const r = await fn();
      setMsg(r.error ? { error: r.error } : { saved: !!ok });
    });

  const preview: InvoiceDocData = {
    ...doc,
    billName: d.billName || "—",
    billGstin: d.billGstin,
    billAddress: d.billAddress,
    placeOfSupply: d.placeOfSupply,
    gstRate: d.gstRate,
    advance: paise(d.advance),
    note: d.note,
    items: lines.map((l) => ({ description: l.description, hsn: l.hsn, qty: count(l.qty), unit: l.unit, rate: paise(l.rate) })),
  };

  return (
    <div className="split inv-split">
      <div className="col-main">
        <section className="card">
          <div className="card-hd"><h2>Details</h2><span>Number and date are set when you issue</span></div>
          <div className="pad">
            <div className="row">
              <label className="fld"><span className="lbl">Bill to</span><input className="in" maxLength={120} value={d.billName} onChange={(e) => set("billName", e.target.value)} /></label>
              <label className="fld"><span className="lbl">Customer GSTIN</span><input className="in mono" maxLength={15} placeholder="Leave blank for B2C" value={d.billGstin} onChange={(e) => set("billGstin", e.target.value.toUpperCase())} /></label>
            </div>
            <label className="fld full"><span className="lbl">Billing address</span><input className="in" maxLength={400} value={d.billAddress} onChange={(e) => set("billAddress", e.target.value)} /></label>
            <div className="row">
              <label className="fld">
                <span className="lbl">Place of supply</span>
                <select className="in" value={d.placeOfSupply} onChange={(e) => set("placeOfSupply", e.target.value)}>{STATES.map(([c, n]) => <option key={c} value={c}>{c} – {n}</option>)}</select>
                <span className="hint">{d.placeOfSupply === doc.seller.stateCode ? "Same state · CGST + SGST" : "Other state · IGST"}</span>
              </label>
              <label className="fld w-sm"><span className="lbl">GST rate</span><select className="in" value={d.gstRate} onChange={(e) => set("gstRate", Number(e.target.value))}>{GST_RATES.map((r) => <option key={r} value={r}>{r ? `${r}%` : "No GST"}</option>)}</select></label>
            </div>
          </div>
        </section>

        <section className="card">
          <div className="card-hd"><h2>Lines</h2><button type="button" className="btn btn-o btn-sm" disabled={lines.length >= 30} onClick={() => setLines((l) => [...l, { key: nextKey++, description: "", hsn: "4911", qty: "1", unit: "pcs", rate: "" }])}>Add line</button></div>
          {lines.map((l, n) => (
            <div key={l.key} className="pad item">
              <div className="row">
                <label className="fld full"><span className="lbl">Description</span><input className="in" maxLength={300} value={l.description} onChange={(e) => patch(l.key, { description: e.target.value })} /></label>
              </div>
              <div className="row line-row">
                <label className="fld w-sm"><span className="lbl">HSN / SAC</span><input className="in mono" maxLength={8} value={l.hsn} onChange={(e) => patch(l.key, { hsn: e.target.value })} /></label>
                <label className="fld w-sm"><span className="lbl">Qty</span><input className="in num" inputMode="numeric" value={l.qty} onChange={(e) => patch(l.key, { qty: e.target.value })} /></label>
                <label className="fld w-sm"><span className="lbl">Unit</span><select className="in" value={l.unit} onChange={(e) => patch(l.key, { unit: e.target.value })}>{UNITS.map((u) => <option key={u}>{u}</option>)}</select></label>
                <label className="fld w-sm"><span className="lbl">Rate (₹)</span><input className="in num" inputMode="decimal" value={l.rate} onChange={(e) => patch(l.key, { rate: e.target.value })} /></label>
                <button type="button" className="icon-btn" disabled={lines.length === 1} aria-label={`Remove line ${n + 1}`} onClick={() => setLines((x) => x.filter((y) => y.key !== l.key))}><IconTrash /></button>
              </div>
            </div>
          ))}
          <div className="pad row">
            <label className="fld w-sm"><span className="lbl">Advance received (₹)</span><input className="in num" inputMode="decimal" value={d.advance} onChange={(e) => set("advance", e.target.value)} /></label>
            <label className="fld"><span className="lbl">Note on invoice</span><input className="in" maxLength={300} placeholder="e.g. Thank you for your business." value={d.note} onChange={(e) => set("note", e.target.value)} /></label>
          </div>
        </section>

        <div className="form-foot">
          <button type="button" className="btn btn-o" disabled={pending} onClick={() => run(() => saveDraftAction(id, input()), "saved")}>Save draft</button>
          <button
            type="button"
            className="btn btn-p"
            disabled={pending}
            onClick={() => window.confirm("Issue this invoice? It gets the next invoice number and can no longer be edited.") && run(() => issueAction(id, input()))}
          >
            Issue invoice
          </button>
          {msg.error ? <p className="msg err" role="alert">{msg.error}</p> : msg.saved ? <p className="msg ok" role="status">Draft saved</p> : null}
        </div>
      </div>
      <div className="col-side inv-preview">
        <span className="sub">Preview · A4</span>
        <InvoiceDoc d={preview} />
      </div>
    </div>
  );
}
