"use client";

import { useState, useTransition } from "react";
import { issueChallanAction, saveChallanAction } from "@/app/(admin)/admin/challans/actions";
import { IconTrash } from "@/components/admin/icons";
import { ChallanDoc, type ChallanDocData } from "@/components/challan-doc";
import { PURPOSES, type ChallanInput } from "@/lib/admin-challans";
import { DELIVERY, UNITS } from "@/lib/order-format";

type Item = ChallanInput["items"][number] & { key: number };

let nextKey = 0;
const count = (v: string) => (/^\d+$/.test(v.trim()) ? Number(v) : 0);

export function ChallanEditor({ id, initial, doc }: { id: number; initial: ChallanInput; doc: Pick<ChallanDocData, "no" | "issuedOn" | "orderNo" | "seller"> }) {
  const [d, setD] = useState(() => ({ ...initial, items: undefined }));
  const [items, setItems] = useState<Item[]>(() => initial.items.map((i) => ({ ...i, key: nextKey++ })));
  const [msg, setMsg] = useState<{ error?: string; saved?: boolean }>({});
  const [pending, start] = useTransition();

  const set = <K extends keyof typeof d>(k: K, v: (typeof d)[K]) => setD((x) => ({ ...x, [k]: v }));
  const patch = (key: number, p: Partial<Item>) => setItems((l) => l.map((x) => (x.key === key ? { ...x, ...p } : x)));
  const input = (): ChallanInput => ({ ...d, items: items.map((i) => ({ description: i.description, qty: i.qty, unit: i.unit, packing: i.packing })) });

  const run = (fn: () => Promise<{ error?: string }>, saved?: boolean) =>
    start(async () => {
      setMsg({});
      const r = await fn();
      setMsg(r.error ? { error: r.error } : { saved });
    });

  const preview: ChallanDocData = {
    ...doc,
    deliverTo: d.deliverTo || "—",
    phone: d.phone,
    address: d.address,
    vehicle: d.vehicle,
    purpose: PURPOSES.find(([k]) => k === d.purpose)![1],
    returnable: d.returnable,
    items: items.map((i) => ({ description: i.description, qty: count(i.qty), unit: i.unit, packing: i.packing })),
  };

  return (
    <div className="split inv-split">
      <div className="col-main">
        <section className="card">
          <div className="card-hd"><h2>Details</h2><span>Number and date are set when you issue</span></div>
          <div className="pad">
            <div className="row">
              <label className="fld"><span className="lbl">Deliver to</span><input className="in" maxLength={120} value={d.deliverTo} onChange={(e) => set("deliverTo", e.target.value)} /></label>
              <label className="fld"><span className="lbl">Phone</span><input className="in" maxLength={40} value={d.phone} onChange={(e) => set("phone", e.target.value)} /></label>
            </div>
            <label className="fld full"><span className="lbl">Delivery address</span><input className="in" maxLength={400} value={d.address} onChange={(e) => set("address", e.target.value)} /></label>
            <div className="row">
              <label className="fld"><span className="lbl">Mode</span><select className="in" value={d.mode} onChange={(e) => set("mode", e.target.value as typeof d.mode)}>{DELIVERY.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
              <label className="fld"><span className="lbl">Delivered by / vehicle</span><input className="in" maxLength={80} placeholder="e.g. Ramesh · GJ-05-AB-1234" value={d.vehicle} onChange={(e) => set("vehicle", e.target.value)} /></label>
            </div>
            <div className="row">
              <label className="fld"><span className="lbl">Purpose</span><select className="in" value={d.purpose} onChange={(e) => set("purpose", e.target.value as typeof d.purpose)}>{PURPOSES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
              <label className="fld w-sm"><span className="lbl">Returnable</span><select className="in" value={d.returnable ? "yes" : "no"} onChange={(e) => set("returnable", e.target.value === "yes")}><option value="no">No</option><option value="yes">Yes</option></select></label>
            </div>
          </div>
        </section>

        <section className="card">
          <div className="card-hd"><h2>Items</h2><button type="button" className="btn btn-o btn-sm" disabled={items.length >= 30} onClick={() => setItems((l) => [...l, { key: nextKey++, description: "", qty: "1", unit: "pcs", packing: "" }])}>Add item</button></div>
          {items.map((i, n) => (
            <div key={i.key} className="pad item">
              <label className="fld full"><span className="lbl">Item</span><input className="in" maxLength={300} value={i.description} onChange={(e) => patch(i.key, { description: e.target.value })} /></label>
              <div className="row line-row">
                <label className="fld w-sm"><span className="lbl">Quantity</span><input className="in num" inputMode="numeric" value={i.qty} onChange={(e) => patch(i.key, { qty: e.target.value })} /></label>
                <label className="fld w-sm"><span className="lbl">Unit</span><select className="in" value={i.unit} onChange={(e) => patch(i.key, { unit: e.target.value })}>{UNITS.map((u) => <option key={u}>{u}</option>)}</select></label>
                <label className="fld"><span className="lbl">Packing</span><input className="in" maxLength={80} placeholder="e.g. 10 boxes × 100" value={i.packing} onChange={(e) => patch(i.key, { packing: e.target.value })} /></label>
                <button type="button" className="icon-btn" disabled={items.length === 1} aria-label={`Remove item ${n + 1}`} onClick={() => setItems((x) => x.filter((y) => y.key !== i.key))}><IconTrash /></button>
              </div>
            </div>
          ))}
        </section>

        <div className="form-foot">
          <button type="button" className="btn btn-o" disabled={pending} onClick={() => run(() => saveChallanAction(id, input()), true)}>Save draft</button>
          <button type="button" className="btn btn-p" disabled={pending} onClick={() => window.confirm("Issue this challan? It gets the next challan number and can no longer be edited.") && run(() => issueChallanAction(id, input()))}>Issue challan</button>
          {msg.error ? <p className="msg err" role="alert">{msg.error}</p> : msg.saved ? <p className="msg ok" role="status">Draft saved</p> : null}
        </div>
      </div>
      <div className="col-side inv-preview">
        <span className="sub">Preview · A4 · prints customer and office copies</span>
        <ChallanDoc d={preview} copy="Customer copy" />
      </div>
    </div>
  );
}
