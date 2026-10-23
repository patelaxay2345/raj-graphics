import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/admin/action-form";
import { CategoryDetails } from "@/components/admin/category-details";
import { HiddenFields, MoveButtons, Switch } from "@/components/admin/controls";
import { IconBack, IconExternal, IconPlus, IconTrash } from "@/components/admin/icons";
import { ImageSlot } from "@/components/admin/image-slot";
import { TopBar } from "@/components/admin/top-bar";
import { getDb } from "@/db";
import { getAdminCategory } from "@/lib/admin-categories";
import { img } from "@/lib/site";
import * as a from "../actions";

export default async function CategoryEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = /^\d{1,9}$/.test(id) ? await getAdminCategory(getDb(), Number(id)) : undefined;
  if (!c) notFound();
  const designs = c.groups.reduce((n, g) => n + g.designs.length, 0);
  const own = { categoryId: c.id };

  return (
    <>
      <TopBar crumbs={["Catalog", "Categories", c.name]} />
      <main className="main">
        <div className="head">
          <div><Link className="back" href="/admin/categories"><IconBack />Categories</Link><h1>{c.name}</h1></div>
          <div className="acts">
            <a className="btn btn-o" href={`/c/${c.slug}`} target="_blank" rel="noopener"><IconExternal />View on site</a>
            <ActionForm action={a.deleteCategoryAction} confirm={`Delete ${c.name}? This cannot be undone.`}>
              <HiddenFields id={c.id} />
              <button className="btn btn-o btn-danger" disabled={c.groups.length > 0} title={c.groups.length ? "Remove its design groups first, or hide it instead" : undefined}>Delete</button>
            </ActionForm>
          </div>
        </div>

        <div className="split">
          <div className="col-main">
            <section className="card">
              <div className="card-hd"><h2>Details</h2></div>
              <CategoryDetails action={a.updateCategoryAction} values={c} submit="Save changes" />
            </section>

            <section className="card">
              <div className="card-hd"><h2>Images</h2></div>
              <div className="pad imgs">
                <ImageSlot categoryId={c.id} slot="mockup" label="Mockup (category page header)" hint="Wide image · up to 1200 px" src={c.mockupKey && img(c.mockupKey)} maxSide={1200} />
                <ImageSlot categoryId={c.id} slot="cover" label="Card image (used when there is no mockup)" hint="Up to 600 px" src={img(c.coverKey)} maxSide={600} />
              </div>
            </section>

            <section className="card">
              <div className="card-hd"><h2>Variants · {c.variants.length}</h2><span>Finish options on the category page</span></div>
              <ul className="list">
                {c.variants.map((v, i) => (
                  <li key={v.id}>
                    <div className="acts"><MoveButtons action={a.moveVariantAction} hidden={{ ...own, id: v.id }} first={i === 0} last={i === c.variants.length - 1} label={v.title} /></div>
                    <ActionForm action={a.updateVariantAction} className="inline" savedLabel="Saved">
                      <HiddenFields {...own} id={v.id} />
                      <input className="in" name="title" defaultValue={v.title} required maxLength={80} aria-label="Variant title" />
                      <input className="in" name="feature" defaultValue={v.feature} maxLength={120} aria-label="Variant feature" />
                      <button className="btn btn-o btn-sm">Save</button>
                    </ActionForm>
                    <ActionForm action={a.deleteVariantAction} confirm={`Remove variant ${v.title}?`}>
                      <HiddenFields {...own} id={v.id} />
                      <button className="icon-btn" aria-label={`Remove ${v.title}`}><IconTrash /></button>
                    </ActionForm>
                  </li>
                ))}
                <li>
                  <ActionForm action={a.addVariantAction} className="inline" resetOnSave>
                    <HiddenFields {...own} />
                    <input className="in" name="title" required maxLength={80} placeholder="New variant title" aria-label="New variant title" />
                    <input className="in" name="feature" maxLength={120} placeholder="Short feature" aria-label="New variant feature" />
                    <button className="btn btn-o btn-sm"><IconPlus />Add variant</button>
                  </ActionForm>
                </li>
              </ul>
            </section>

            <section className="card">
              <div className="card-hd"><h2>Design groups · {c.groups.length}</h2><span>Tabs on the category page</span></div>
              <ul className="list">
                {c.groups.map((g, i) => (
                  <li key={g.id}>
                    <div className="acts"><MoveButtons action={a.moveGroupAction} hidden={{ ...own, id: g.id }} first={i === 0} last={i === c.groups.length - 1} label={g.title} /></div>
                    {g.designs[0] ? <img className="thumb" src={img(g.designs[0].imageKey)} alt="" /> : <span className="thumb-ph" />}
                    <ActionForm action={a.renameGroupAction} className="inline" savedLabel="Saved">
                      <HiddenFields {...own} id={g.id} />
                      <input className="in" name="title" defaultValue={g.title} required maxLength={80} aria-label="Group title" />
                      <button className="btn btn-o btn-sm">Rename</button>
                    </ActionForm>
                    <span className="count">{g.designs.length} {g.designs.length === 1 ? "design" : "designs"}</span>
                    <Link className="btn btn-o btn-sm" href={`/admin/designs?c=${c.slug}&g=${g.id}`}>Open</Link>
                    <ActionForm action={a.deleteGroupAction} confirm={`Delete group ${g.title}?`}>
                      <HiddenFields {...own} id={g.id} />
                      <button className="icon-btn" disabled={g.designs.length > 0} aria-label={`Delete ${g.title}`} title={g.designs.length ? "Only empty groups can be deleted" : undefined}><IconTrash /></button>
                    </ActionForm>
                  </li>
                ))}
                <li>
                  <ActionForm action={a.addGroupAction} className="inline" resetOnSave>
                    <HiddenFields {...own} />
                    <input className="in" name="title" required maxLength={80} placeholder="New group title" aria-label="New group title" />
                    <button className="btn btn-o btn-sm"><IconPlus />Add group</button>
                  </ActionForm>
                </li>
              </ul>
            </section>
          </div>

          <div className="col-side">
            <section className="card">
              <div className="card-hd"><h2>Visibility</h2></div>
              <div className="pad">
                <div className="toggle-row"><div><b>Visible on site</b><span>Shown in menus, search and its own page</span></div><Switch action={a.setFlagAction} hidden={{ id: c.id, flag: "active" }} on={c.active} label="Visible on site" /></div>
                <div className="toggle-row"><div><b>Show on home page</b><span>Shop by Category grid</span></div><Switch action={a.setFlagAction} hidden={{ id: c.id, flag: "showOnHome" }} on={c.showOnHome} label="Show on home page" /></div>
              </div>
            </section>
            <section className="card">
              <div className="card-hd"><h2>Home card preview</h2></div>
              <div className="pad">
                <a className="preview" href={`/c/${c.slug}`} target="_blank" rel="noopener">
                  <img src={img(c.mockupKey || c.coverKey)} alt="" />
                  <div><b>{c.name}</b>{c.tag && <span className="tag">{c.tag}</span>}<span>⏱ {c.turnaround} · {designs ? `${designs} designs` : "Get a quote"}</span></div>
                </a>
              </div>
            </section>
            <section className="card">
              <div className="card-hd"><h2>At a glance</h2></div>
              <div className="pad">
                <dl className="dl">
                  <dt>Designs</dt><dd className="mono">{designs} in {c.groups.length} groups</dd>
                  <dt>Variants</dt><dd className="mono">{c.variants.length}</dd>
                  <dt>Next design code</dt><dd className="mono">{c.designPrefix}{c.nextDesignNo}</dd>
                  <dt>Last edited</dt><dd>{c.updatedAt.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" })}</dd>
                </dl>
              </div>
            </section>
          </div>
        </div>
      </main>
    </>
  );
}
