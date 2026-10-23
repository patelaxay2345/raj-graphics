import { ActionForm } from "@/components/admin/action-form";
import { TopBar } from "@/components/admin/top-bar";
import { getDb } from "@/db";
import { STATES } from "@/lib/gst";
import { PLACEHOLDER_WA, getSeller, getStore } from "@/lib/settings";
import { showPhone } from "@/lib/order-format";
import { saveBillingAction, saveStoreAction } from "./actions";

export default async function SettingsPage() {
  const db = getDb();
  const [s, st] = await Promise.all([getSeller(db), getStore(db)]);
  return (
    <>
      <TopBar crumbs={["Store", "Settings"]} />
      <main className="main">
        <div className="head"><div><h1>Settings</h1><p>Shop details shown on the website, and billing details printed on tax invoices.</p></div></div>
        {st.whatsapp === PLACEHOLDER_WA && <p className="note warn" role="status"><b>WhatsApp number is a placeholder.</b> Every “Chat on WhatsApp” button on the site uses it, so set your real number before launch.</p>}
        {!s.gstin && <p className="note warn" role="status"><b>GSTIN not set.</b> Draft invoices work, but you can issue tax invoices only after adding your GSTIN.</p>}

        <ActionForm action={saveStoreAction} className="stack" savedLabel="Saved · the site shows the new details now">
          <section className="card" id="business">
            <div className="card-hd"><h2>Business profile</h2><span>Site header, footer and page titles</span></div>
            <div className="pad">
              <div className="row">
                <label className="fld"><span className="lbl">Business name</span><input className="in" name="name" required maxLength={60} defaultValue={st.name} /></label>
                <label className="fld"><span className="lbl">Tagline</span><input className="in" name="tagline" maxLength={60} defaultValue={st.tagline} /></label>
              </div>
              <label className="fld full"><span className="lbl">Footer about text</span><textarea className="in" name="about" maxLength={300} defaultValue={st.about} /></label>
            </div>
          </section>
          <section className="card" id="contact">
            <div className="card-hd"><h2>Contact &amp; WhatsApp</h2><span>Footer, contact section and every WhatsApp button</span></div>
            <div className="pad">
              <div className="row">
                <label className="fld"><span className="lbl">WhatsApp number</span><input className="in" name="whatsapp" required inputMode="tel" maxLength={20} defaultValue={showPhone(st.whatsapp)} /><span className="hint">With country code · customers message this number</span></label>
                <label className="fld"><span className="lbl">Phone shown on site</span><input className="in" name="phone" maxLength={40} defaultValue={st.phone} /></label>
                <label className="fld"><span className="lbl">Email</span><input className="in" name="email" type="email" maxLength={120} defaultValue={st.email} /></label>
              </div>
              <div className="row">
                <label className="fld"><span className="lbl">Address</span><input className="in" name="address" maxLength={200} defaultValue={st.address} /></label>
                <label className="fld"><span className="lbl">Opening hours</span><input className="in" name="hours" maxLength={80} defaultValue={st.hours} /></label>
              </div>
              <div className="row">
                <label className="fld"><span className="lbl">Facebook</span><input className="in" name="facebook" type="url" maxLength={200} placeholder="https://facebook.com/…" defaultValue={st.facebook} /></label>
                <label className="fld"><span className="lbl">Instagram</span><input className="in" name="instagram" type="url" maxLength={200} placeholder="https://instagram.com/…" defaultValue={st.instagram} /></label>
                <label className="fld"><span className="lbl">YouTube</span><input className="in" name="youtube" type="url" maxLength={200} placeholder="https://youtube.com/…" defaultValue={st.youtube} /></label>
                <label className="fld"><span className="lbl">LinkedIn</span><input className="in" name="linkedin" type="url" maxLength={200} placeholder="https://linkedin.com/…" defaultValue={st.linkedin} /></label>
              </div>
              <span className="hint">Empty fields are hidden on the site.</span>
            </div>
          </section>
          <section className="card" id="seo">
            <div className="card-hd"><h2>SEO</h2><span>How the site appears on Google and in WhatsApp link previews</span></div>
            <div className="pad">
              <label className="fld full"><span className="lbl">Page title</span><input className="in" name="seoTitle" required maxLength={70} defaultValue={st.seoTitle} /></label>
              <label className="fld full"><span className="lbl">Search description</span><textarea className="in" name="seoDescription" maxLength={160} defaultValue={st.seoDescription} /><span className="hint">Up to 160 characters</span></label>
            </div>
          </section>
          <div className="form-foot"><button className="btn btn-p">Save shop details</button></div>
        </ActionForm>
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
