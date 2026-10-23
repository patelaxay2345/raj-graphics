import { asc } from "drizzle-orm";
import { ActionForm } from "@/components/admin/action-form";
import { HiddenFields, MoveButtons, Switch } from "@/components/admin/controls";
import { IconExternal, IconPlus, IconTrash } from "@/components/admin/icons";
import { ImageSlot } from "@/components/admin/image-slot";
import { TopBar } from "@/components/admin/top-bar";
import { getDb } from "@/db";
import { categories } from "@/db/schema";
import { DEFAULT_HOME, getHome, listTestimonials } from "@/lib/home";
import { img } from "@/lib/site";
import * as a from "./actions";

const BEST_SLOTS = 8;

const Pairs = ({ name, items, label }: { name: string; items: { title: string; text: string }[]; label: string }) => (
  <ol className="pairs">
    {items.map((it, i) => (
      <li key={i}>
        <span className="n">{i + 1}</span>
        <input className="in" name={`${name}.${i}.title`} defaultValue={it.title} required maxLength={40} aria-label={`${label} ${i + 1} title`} />
        <input className="in" name={`${name}.${i}.text`} defaultValue={it.text} maxLength={120} aria-label={`${label} ${i + 1} text`} />
      </li>
    ))}
  </ol>
);

const Heading = ({ name, value }: { name: string; value: { title: string; subtitle: string } }) => (
  <div className="row">
    <label className="fld"><span className="lbl">Section title</span><input className="in" name={`${name}.title`} defaultValue={value.title} required maxLength={60} /></label>
    <label className="fld"><span className="lbl">Subtitle</span><input className="in" name={`${name}.subtitle`} defaultValue={value.subtitle} maxLength={200} /></label>
  </div>
);

export default async function HomeContentPage() {
  const db = getDb();
  const [h, reviews, cats] = await Promise.all([
    getHome(db),
    listTestimonials(db),
    db.select({ id: categories.id, name: categories.name, showOnHome: categories.showOnHome, homeSort: categories.homeSort, mockupKey: categories.mockupKey, coverKey: categories.coverKey, active: categories.active }).from(categories).orderBy(asc(categories.sort), asc(categories.id)),
  ]);
  const featured = cats.filter((c) => c.showOnHome).sort((x, y) => x.homeSort - y.homeSort || x.id - y.id);
  const rest = cats.filter((c) => !c.showOnHome);
  const images = [...new Set([...DEFAULT_HOME.best.items.map((b) => b.imageKey), ...h.best.items.map((b) => b.imageKey), ...cats.flatMap((c) => [c.mockupKey, c.coverKey].filter((k): k is string => !!k))])];
  const best = [...h.best.items, ...Array.from({ length: BEST_SLOTS - h.best.items.length }, () => ({ name: "", imageKey: "" }))];

  return (
    <>
      <TopBar crumbs={["Store", "Home page"]} />
      <main className="main">
        <div className="head">
          <div><h1>Home page</h1><p>Every section of the storefront home page. Changes show on the site as soon as you save.</p></div>
          <a className="btn btn-o" href="/" target="_blank" rel="noopener"><IconExternal />View home page</a>
        </div>

        <div className="split">
          <div className="col-main">
            <ActionForm action={a.saveHomeAction} className="stack" savedLabel="Saved · the home page is updated">
              <section className="card" id="hero">
                <div className="card-hd"><h2>Hero</h2><span>First thing visitors see. Keep the headline short.</span></div>
                <div className="pad">
                  <label className="fld full"><span className="lbl">Badge</span><input className="in" name="hero.pill" defaultValue={h.hero.pill} maxLength={60} /></label>
                  <div className="row">
                    <label className="fld"><span className="lbl">Headline</span><input className="in" name="hero.title" defaultValue={h.hero.title} required maxLength={60} /></label>
                    <label className="fld"><span className="lbl">Highlighted line</span><input className="in" name="hero.highlight" defaultValue={h.hero.highlight} maxLength={60} /></label>
                  </div>
                  <label className="fld full"><span className="lbl">Intro text</span><textarea className="in" name="hero.text" defaultValue={h.hero.text} maxLength={300} /></label>
                  <input type="hidden" name="hero.imageKey" value={h.hero.imageKey} />
                  <span className="lbl">Highlights under the hero</span>
                  <ol className="pairs">
                    {h.hero.feats.map((f, i) => (
                      <li key={i}>
                        <span className="n">{i + 1}</span>
                        <input className="in" name={`hero.feats.${i}.value`} defaultValue={f.value} required maxLength={24} aria-label={`Highlight ${i + 1} value`} />
                        <input className="in" name={`hero.feats.${i}.label`} defaultValue={f.label} maxLength={40} aria-label={`Highlight ${i + 1} label`} />
                      </li>
                    ))}
                  </ol>
                </div>
              </section>

              <section className="card" id="products">
                <div className="card-hd"><h2>Shop by category</h2><span>Pick and order the categories in the panel on the right</span></div>
                <div className="pad"><Heading name="products" value={h.products} /></div>
              </section>

              <section className="card" id="why">
                <div className="card-hd"><h2>Why choose us</h2><span>Four reasons, each with an icon</span></div>
                <div className="pad"><Heading name="why" value={h.why} /><Pairs name="why.items" items={h.why.items} label="Reason" /></div>
              </section>

              <section className="card" id="how">
                <div className="card-hd"><h2>How it works</h2><span>Five ordering steps</span></div>
                <div className="pad"><Heading name="how" value={h.how} /><Pairs name="how.steps" items={h.how.steps} label="Step" /></div>
              </section>

              <section className="card" id="custom">
                <div className="card-hd"><h2>Custom printing banner</h2><span>Opens a custom enquiry</span></div>
                <div className="pad">
                  <div className="row">
                    <label className="fld"><span className="lbl">Headline</span><input className="in" name="custom.title" defaultValue={h.custom.title} required maxLength={60} /></label>
                    <label className="fld"><span className="lbl">Highlighted line</span><input className="in" name="custom.highlight" defaultValue={h.custom.highlight} maxLength={60} /></label>
                    <label className="fld"><span className="lbl">Button</span><input className="in" name="custom.button" defaultValue={h.custom.button} required maxLength={40} /></label>
                  </div>
                  <label className="fld full"><span className="lbl">Text</span><input className="in" name="custom.text" defaultValue={h.custom.text} maxLength={200} /></label>
                  <span className="lbl">Checklist</span>
                  <div className="row">
                    {h.custom.checks.map((c, i) => <input key={i} className="in fld" name={`custom.checks.${i}`} defaultValue={c} maxLength={40} aria-label={`Checklist item ${i + 1}`} />)}
                  </div>
                </div>
              </section>

              <section className="card" id="best">
                <div className="card-hd"><h2>Best sellers</h2><span>Each opens a quote form · leave a name empty to hide that slot</span></div>
                <div className="pad">
                  <Heading name="best" value={h.best} />
                  <ol className="pairs">
                    {best.map((b, i) => (
                      <li key={i}>
                        <span className="n">{i + 1}</span>
                        <input className="in" name={`best.items.${i}.name`} defaultValue={b.name} maxLength={60} placeholder="Product name" aria-label={`Best seller ${i + 1} name`} />
                        <select className="in" name={`best.items.${i}.imageKey`} defaultValue={b.imageKey} aria-label={`Best seller ${i + 1} image`}>
                          <option value="">Pick image…</option>
                          {images.map((k) => <option key={k} value={k}>{k}</option>)}
                        </select>
                        {b.imageKey ? <img className="thumb" src={img(b.imageKey)} alt="" /> : <span className="thumb-ph" />}
                      </li>
                    ))}
                  </ol>
                </div>
              </section>

              <section className="card" id="reviews-heading">
                <div className="card-hd"><h2>Reviews heading</h2><span>The reviews themselves are in the panel on the right</span></div>
                <div className="pad"><Heading name="reviews" value={h.reviews} /></div>
              </section>

              <div className="form-foot"><button className="btn btn-p">Save home page</button></div>
            </ActionForm>
          </div>

          <div className="col-side">
            <section className="card">
              <div className="card-hd"><h2>Hero image</h2></div>
              <div className="pad">
                <ImageSlot url="/api/admin/home/image" label="Image beside the headline" hint="PNG cut-out works best · up to 1200 px" src={img(h.hero.imageKey)} maxSide={1200} />
              </div>
            </section>

            <section className="card" id="featured">
              <div className="card-hd"><h2>Home categories · {featured.length}</h2><span>Order on the home grid</span></div>
              <ul className="list">
                {featured.map((c, i) => (
                  <li key={c.id}>
                    <div className="acts"><MoveButtons action={a.moveHomeCategoryAction} hidden={{ id: c.id }} first={i === 0} last={i === featured.length - 1} label={c.name} /></div>
                    <img className="thumb" src={img(c.mockupKey || c.coverKey)} alt="" />
                    <span className="grow">{c.name}{!c.active && <span className="sub"> · hidden on site</span>}</span>
                    <ActionForm action={a.setHomeCategoryAction}>
                      <HiddenFields id={c.id} on="false" />
                      <button className="icon-btn" aria-label={`Remove ${c.name} from home page`}><IconTrash /></button>
                    </ActionForm>
                  </li>
                ))}
              </ul>
              {rest.length > 0 && (
                <div className="pad">
                  <span className="lbl">Add to home page</span>
                  <div className="chips">
                    {rest.map((c) => (
                      <ActionForm key={c.id} action={a.setHomeCategoryAction}>
                        <HiddenFields id={c.id} on="true" />
                        <button className="chip">+ {c.name}</button>
                      </ActionForm>
                    ))}
                  </div>
                </div>
              )}
            </section>

            <section className="card" id="reviews">
              <div className="card-hd"><h2>Customer reviews · {reviews.length}</h2><span>Shown only when at least one is visible</span></div>
              <ul className="list reviews-list">
                {reviews.map((r, i) => (
                  <li key={r.id}>
                    <div className="acts">
                      <MoveButtons action={a.moveReviewAction} hidden={{ id: r.id }} first={i === 0} last={i === reviews.length - 1} label={`review by ${r.name}`} />
                      <Switch action={a.setReviewActiveAction} hidden={{ id: r.id }} on={r.active} label={`Show review by ${r.name}`} />
                      <ActionForm action={a.deleteReviewAction} confirm={`Delete the review by ${r.name}?`}>
                        <HiddenFields id={r.id} />
                        <button className="icon-btn" aria-label={`Delete review by ${r.name}`}><IconTrash /></button>
                      </ActionForm>
                    </div>
                    <ActionForm action={a.updateReviewAction} className="review-form" savedLabel="Saved">
                      <HiddenFields id={r.id} />
                      <textarea className="in" name="quote" defaultValue={r.quote} required maxLength={400} rows={2} aria-label="Review text" />
                      <div className="row">
                        <input className="in fld" name="name" defaultValue={r.name} required maxLength={60} aria-label="Customer name" />
                        <input className="in fld" name="role" defaultValue={r.role} maxLength={60} aria-label="Customer role" />
                        <button className="btn btn-o btn-sm">Save</button>
                      </div>
                    </ActionForm>
                  </li>
                ))}
              </ul>
              <ActionForm action={a.addReviewAction} className="pad review-form" resetOnSave>
                <span className="lbl">Add a real customer review</span>
                <textarea className="in" name="quote" required maxLength={400} rows={2} placeholder="What the customer said" aria-label="New review text" />
                <div className="row">
                  <input className="in fld" name="name" required maxLength={60} placeholder="Customer name" aria-label="New review name" />
                  <input className="in fld" name="role" maxLength={60} placeholder="e.g. Clinic owner, Surat" aria-label="New review role" />
                  <button className="btn btn-o btn-sm"><IconPlus />Add</button>
                </div>
              </ActionForm>
            </section>
          </div>
        </div>
      </main>
    </>
  );
}
