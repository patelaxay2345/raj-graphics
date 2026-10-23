import { ActionForm } from "@/components/admin/action-form";
import { TopBar } from "@/components/admin/top-bar";
import { getDb } from "@/db";
import { STATES } from "@/lib/gst";
import { getSeller } from "@/lib/settings";
import { saveBillingAction } from "./actions";

export default async function SettingsPage() {
  const s = await getSeller(getDb());
  return (
    <>
      <TopBar crumbs={["Store", "Settings"]} />
      <main className="main">
        <div className="head"><div><h1>Settings</h1><p>Billing details printed on tax invoices. Shop contact, site content and messages come next.</p></div></div>
        {!s.gstin && <p className="note warn" role="status"><b>GSTIN not set.</b> Draft invoices work, but you can issue tax invoices only after adding your GSTIN.</p>}
        <section className="card" id="billing">
          <div className="card-hd"><h2>Billing &amp; GST</h2><span>Printed on every tax invoice · issued invoices keep the details they were issued with</span></div>
          <ActionForm action={saveBillingAction} className="pad" savedLabel="Saved">
            <div className="row">
              <label className="fld"><span className="lbl">Legal name on invoice</span><input className="in" name="legalName" required maxLength={120} defaultValue={s.legalName} /></label>
              <label className="fld"><span className="lbl">GSTIN</span><input className="in mono" name="gstin" maxLength={15} placeholder="24ABCDE1234F1Z5" defaultValue={s.gstin} /><span className="hint">Required to issue tax invoices</span></label>
              <label className="fld w-sm"><span className="lbl">PAN</span><input className="in mono" name="pan" maxLength={10} placeholder="ABCDE1234F" defaultValue={s.pan} /></label>
            </div>
            <div className="row">
              <label className="fld">
                <span className="lbl">State (place of business)</span>
                <select className="in" name="stateCode" defaultValue={s.stateCode}>{STATES.map(([c, n]) => <option key={c} value={c}>{n} ({c})</option>)}</select>
                <span className="hint">Same-state customers get CGST + SGST, others IGST</span>
              </label>
              <label className="fld"><span className="lbl">Phone on invoice</span><input className="in" name="phone" maxLength={40} defaultValue={s.phone} /></label>
              <label className="fld"><span className="lbl">Email on invoice</span><input className="in" name="email" type="email" maxLength={120} defaultValue={s.email} /></label>
            </div>
            <label className="fld full"><span className="lbl">Billing address</span><textarea className="in" name="address" maxLength={400} placeholder="Shop no, street, city, PIN" defaultValue={s.address} /></label>
            <div className="row">
              <label className="fld"><span className="lbl">Bank name</span><input className="in" name="bankName" maxLength={80} defaultValue={s.bankName} /></label>
              <label className="fld"><span className="lbl">Account number</span><input className="in mono" name="account" maxLength={20} inputMode="numeric" defaultValue={s.account} /></label>
              <label className="fld w-sm"><span className="lbl">IFSC</span><input className="in mono" name="ifsc" maxLength={11} placeholder="SBIN0001234" defaultValue={s.ifsc} /></label>
              <label className="fld"><span className="lbl">UPI ID</span><input className="in" name="upi" maxLength={60} placeholder="rajgraphics@upi" defaultValue={s.upi} /></label>
            </div>
            <label className="fld full"><span className="lbl">Invoice terms</span><textarea className="in" name="terms" maxLength={1500} defaultValue={s.terms} /></label>
            <div className="form-foot"><button className="btn btn-p">Save billing details</button></div>
          </ActionForm>
        </section>
      </main>
    </>
  );
}
