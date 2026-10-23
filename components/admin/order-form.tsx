"use client";

import { useState, useTransition } from "react";
import { createOrderAction, findCustomerAction, updateOrderAction } from "@/app/(admin)/admin/orders/actions";
import type { OrderInput } from "@/lib/admin-orders";
import { DELIVERY, DESIGN_BY, GST_RATES, PAY_MODES, PROOF_BY, SERVICES, UNITS, inr, service, toPaise, totals, type ServiceId } from "@/lib/order-format";

type Item = OrderInput["items"][number] & { key: number };
type Customer = OrderInput["customer"];

export type OrderFormValues = Omit<OrderInput, "items"> & { items: Omit<Item, "key">[] };

let nextKey = 0;
const blankItem = (id: ServiceId = "vc"): Item => ({ key: nextKey++, service: id, specs: {}, qty: "", unit: service(id).unit, rate: "", hsn: service(id).hsn });
const paise = (v: string | number) => toPaise(String(v)) ?? 0;
const count = (v: string | number) => (/^\d+$/.test(String(v).trim()) ? Number(v) : 0);

export function OrderForm({ id, initial }: { id?: number; initial?: OrderFormValues }) {
  const [customer, setCustomer] = useState<Customer>(initial?.customer ?? { phone: "", name: "", business: "", gstin: "", city: "", address: "" });
  const [items, setItems] = useState<Item[]>(() => initial?.items.map((i) => ({ ...i, key: nextKey++ })) ?? [blankItem()]);
  const [o, setO] = useState(() => ({
    dueOn: initial?.dueOn ?? "",
    deliveryMode: initial?.deliveryMode ?? "pickup",
    designBy: initial?.designBy ?? "we",
    proofBy: initial?.proofBy ?? "whatsapp",
    notes: initial?.notes ?? "",
    gstRate: initial?.gstRate ?? 18,
    advance: initial?.advance ?? "",
    payMode: initial?.payMode ?? "",
  }));
  const [found, setFound] = useState<Omit<Customer, "phone"> | null>(null);
  const [msg, setMsg] = useState<{ error?: string; saved?: boolean }>({});
  const [pending, start] = useTransition();

  const cust = (k: keyof Customer, v: string) => setCustomer((c) => ({ ...c, [k]: v }));
  const patch = (key: number, p: Partial<Item>) => setItems((list) => list.map((i) => (i.key === key ? { ...i, ...p } : i)));
  const t = totals(items.map((i) => ({ qty: count(i.qty), rate: paise(i.rate) })), o.gstRate, paise(o.advance));

  const lookup = async () => {
    if (!customer.phone.trim()) return;
    const c = await findCustomerAction(customer.phone);
    if (c && !customer.name.trim()) setCustomer((x) => ({ ...x, ...c }));
    else setFound(c && c.name !== customer.name ? c : null);
  };

  const save = () =>
    start(async () => {
      setMsg({});
      const input: OrderInput = { customer, ...o, items: items.map((i) => ({ service: i.service, specs: i.specs, qty: i.qty, unit: i.unit, rate: i.rate, hsn: i.hsn })) };
      const r = id ? await updateOrderAction(id, input) : await createOrderAction(input);
      setMsg(r.error ? { error: r.error } : { saved: true });
    });

  return (
    <form className="split" aria-busy={pending} onSubmit={(e) => (e.preventDefault(), save())}>
      <div className="col-main">
        <section className="card">
          <div className="card-hd"><h2>Customer</h2><span>Existing customer? Enter the phone number first</span></div>
          <div className="pad">
            <div className="row">
              <label className="fld"><span className="lbl">Phone / WhatsApp</span><input className="in" required inputMode="tel" maxLength={20} value={customer.phone} onChange={(e) => cust("phone", e.target.value)} onBlur={lookup} /></label>
              <label className="fld"><span className="lbl">Name</span><input className="in" required maxLength={80} value={customer.name} onChange={(e) => cust("name", e.target.value)} /></label>
              <label className="fld"><span className="lbl">Business name</span><input className="in" maxLength={120} placeholder="Optional" value={customer.business} onChange={(e) => cust("business", e.target.value)} /></label>
            </div>
            {found && (
              <p className="note">
                Saved customer for this number: <b>{found.name}</b>{found.city && ` · ${found.city}`}{" "}
                <button type="button" className="btn btn-o btn-sm" onClick={() => (setCustomer((x) => ({ ...x, ...found })), setFound(null))}>Use saved details</button>
              </p>
            )}
            <div className="row">
              <label className="fld"><span className="lbl">GSTIN</span><input className="in mono" maxLength={15} placeholder="Only for B2B invoice" value={customer.gstin} onChange={(e) => cust("gstin", e.target.value.toUpperCase())} /></label>
              <label className="fld"><span className="lbl">City</span><input className="in" maxLength={60} value={customer.city} onChange={(e) => cust("city", e.target.value)} /></label>
              <label className="fld"><span className="lbl">Address</span><input className="in" maxLength={300} placeholder="Billing / delivery address" value={customer.address} onChange={(e) => cust("address", e.target.value)} /></label>
            </div>
          </div>
        </section>

        <section className="card">
          <div className="card-hd"><h2>Job</h2><button type="button" className="btn btn-o btn-sm" disabled={items.length >= 20} onClick={() => setItems((l) => [...l, blankItem()])}>Add another item</button></div>
          {items.map((it, n) => {
            const s = service(it.service);
            return (
              <div key={it.key} className="pad item">
                <div className="item-hd">
                  <div className="chips" role="group" aria-label={`Service for item ${n + 1}`}>
                    {SERVICES.map((x) => (
                      <button key={x.id} type="button" className={x.id === it.service ? "chip on" : "chip"} aria-pressed={x.id === it.service} onClick={() => x.id !== it.service && patch(it.key, { service: x.id, specs: {}, unit: x.unit, hsn: x.hsn })}>{x.label}</button>
                    ))}
                  </div>
                  {items.length > 1 && <button type="button" className="btn btn-o btn-sm btn-danger" onClick={() => setItems((l) => l.filter((x) => x.key !== it.key))}>Remove item</button>}
                </div>
                <div className="row">
                  {s.fields.filter((f) => !f.long).map((f) => (
                    <label key={f.key} className="fld w-sm">
                      <span className="lbl">{f.label}</span>
                      {f.options ? (
                        <select className="in" value={it.specs[f.key] ?? ""} onChange={(e) => patch(it.key, { specs: { ...it.specs, [f.key]: e.target.value } })}>
                          <option value="">—</option>
                          {f.options.map((v) => <option key={v}>{v}</option>)}
                        </select>
                      ) : (
                        <input className="in" maxLength={120} placeholder={f.placeholder} value={it.specs[f.key] ?? ""} onChange={(e) => patch(it.key, { specs: { ...it.specs, [f.key]: e.target.value } })} />
                      )}
                    </label>
                  ))}
                </div>
                {s.fields.filter((f) => f.long).map((f) => (
                  <label key={f.key} className="fld full">
                    <span className="lbl">{f.label}</span>
                    <textarea className="in" maxLength={2000} placeholder={f.placeholder} value={it.specs[f.key] ?? ""} onChange={(e) => patch(it.key, { specs: { ...it.specs, [f.key]: e.target.value } })} />
                  </label>
                ))}
                <div className="row">
                  <label className="fld w-sm"><span className="lbl">Quantity</span><input className="in num" required inputMode="numeric" value={it.qty} onChange={(e) => patch(it.key, { qty: e.target.value })} /></label>
                  <label className="fld w-sm"><span className="lbl">Unit</span><select className="in" value={it.unit} onChange={(e) => patch(it.key, { unit: e.target.value })}>{UNITS.map((u) => <option key={u}>{u}</option>)}</select></label>
                  <label className="fld w-sm"><span className="lbl">Rate (₹)</span><input className="in num" required inputMode="decimal" value={it.rate} onChange={(e) => patch(it.key, { rate: e.target.value })} /></label>
                  <label className="fld w-sm"><span className="lbl">HSN / SAC</span><input className="in mono" maxLength={8} inputMode="numeric" value={it.hsn} onChange={(e) => patch(it.key, { hsn: e.target.value })} /></label>
                  <div className="fld w-sm"><span className="lbl">Line amount</span><div className="num amt">{inr(count(it.qty) * paise(it.rate))}</div></div>
                </div>
              </div>
            );
          })}
        </section>

        <div className="row two">
          <section className="card">
            <div className="card-hd"><h2>Artwork &amp; proof</h2></div>
            <div className="pad">
              <div className="row">
              <label className="fld"><span className="lbl">Design by</span><select className="in" value={o.designBy} onChange={(e) => setO({ ...o, designBy: e.target.value as typeof o.designBy })}>{DESIGN_BY.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
              <label className="fld"><span className="lbl">Proof by</span><select className="in" value={o.proofBy} onChange={(e) => setO({ ...o, proofBy: e.target.value as typeof o.proofBy })}>{PROOF_BY.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
              </div>
            </div>
          </section>
          <section className="card">
            <div className="card-hd"><h2>Delivery</h2></div>
            <div className="pad">
              <div className="row">
                <label className="fld"><span className="lbl">Due date</span><input className="in" type="date" value={o.dueOn ?? ""} onChange={(e) => setO({ ...o, dueOn: e.target.value })} /></label>
                <label className="fld"><span className="lbl">Mode</span><select className="in" value={o.deliveryMode} onChange={(e) => setO({ ...o, deliveryMode: e.target.value as typeof o.deliveryMode })}>{DELIVERY.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
              </div>
              <label className="fld full"><span className="lbl">Notes for press</span><textarea className="in" maxLength={2000} placeholder="Paper stock, machine, cutting instructions…" value={o.notes} onChange={(e) => setO({ ...o, notes: e.target.value })} /></label>
            </div>
          </section>
        </div>
      </div>

      <aside className="col-side">
        <section className="card" aria-label="Order summary">
          <div className="card-hd"><h2>Summary</h2></div>
          <div className="pad sum">
            {items.map((it) => (
              <div key={it.key}><span>{service(it.service).label} × {count(it.qty).toLocaleString("en-IN")}</span><span className="num">{inr(count(it.qty) * paise(it.rate))}</span></div>
            ))}
            <div>
              <span>GST</span>
              <span className="gst">
                <select className="in in-sm" aria-label="GST rate" value={o.gstRate} onChange={(e) => setO({ ...o, gstRate: Number(e.target.value) })}>{GST_RATES.map((r) => <option key={r} value={r}>{r ? `${r}%` : "None"}</option>)}</select>
                <span className="num">{inr(t.tax)}</span>
              </span>
            </div>
            <div className="tot"><span>Total</span><span className="num">{inr(t.total)}</span></div>
            <label className="fld"><span className="lbl">Advance received (₹)</span><input className="in num" inputMode="decimal" value={o.advance} onChange={(e) => setO({ ...o, advance: e.target.value })} /></label>
            <div className="chips" role="radiogroup" aria-label="Payment mode">
              {PAY_MODES.map(([k, l]) => (
                <button key={k} type="button" role="radio" aria-checked={o.payMode === k} className={o.payMode === k ? "chip on" : "chip"} onClick={() => setO({ ...o, payMode: o.payMode === k ? "" : k })}>{l}</button>
              ))}
            </div>
            <div className="tot"><span>Balance due</span><span className="num">{inr(t.balance)}</span></div>
          </div>
          <div className="pad form-foot col">
            <button className="btn btn-p" disabled={pending}>{pending ? "Saving…" : id ? "Save changes" : "Save order"}</button>
            {msg.error ? <p className="msg err" role="alert">{msg.error}</p> : msg.saved ? <p className="msg ok" role="status">Saved</p> : null}
          </div>
        </section>
      </aside>
    </form>
  );
}
