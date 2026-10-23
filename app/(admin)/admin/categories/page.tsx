import Link from "next/link";
import { MoveButtons, Switch } from "@/components/admin/controls";
import { IconEdit, IconExternal, IconSearch } from "@/components/admin/icons";
import { TopBar } from "@/components/admin/top-bar";
import { getDb } from "@/db";
import { listAdminCategories } from "@/lib/admin-categories";
import { img } from "@/lib/site";
import { moveCategoryAction, setFlagAction } from "./actions";

const FILTERS = [["all", "All"], ["home", "On home"], ["hidden", "Hidden"]] as const;

export default async function CategoriesPage({ searchParams }: { searchParams: Promise<{ f?: string; q?: string }> }) {
  const { f = "all", q = "" } = await searchParams;
  const all = await listAdminCategories(getDb());
  const needle = q.trim().toLowerCase();
  const rows = all
    .filter((c) => (f === "home" ? c.showOnHome : f === "hidden" ? !c.active : true))
    .filter((c) => !needle || c.name.toLowerCase().includes(needle) || c.slug.includes(needle));
  const filtered = rows.length !== all.length;

  return (
    <>
      <TopBar crumbs={["Catalog", "Categories"]} />
      <main className="main">
        <div className="head">
          <div><h1>Categories</h1><p>Order here is the order on the site.</p></div>
          <Link className="btn btn-p" href="/admin/categories/new">New category</Link>
        </div>

        <div className="bar">
          <nav className="seg-grp" aria-label="Filter">
            {FILTERS.map(([k, label]) => (
              <Link key={k} className={f === k ? "seg on" : "seg"} aria-current={f === k ? "page" : undefined} href={`/admin/categories?f=${k}${q ? `&q=${encodeURIComponent(q)}` : ""}`}>{label}</Link>
            ))}
          </nav>
          <form className="search" role="search">
            <IconSearch />
            <input type="hidden" name="f" value={f} />
            <input type="search" name="q" defaultValue={q} placeholder="Search categories" aria-label="Search categories" />
          </form>
        </div>

        <section className="card">
          <div className="tbl-wrap">
            <table className="tbl">
              <thead><tr><th>Order</th><th>Category</th><th>Turnaround</th><th>Designs</th><th>Variants</th><th>On home</th><th>Visible</th><th>Actions</th></tr></thead>
              <tbody>
                {rows.map((c) => {
                  const at = all.findIndex((x) => x.id === c.id);
                  return (
                    <tr key={c.id}>
                      <td><div className="acts"><MoveButtons action={moveCategoryAction} hidden={{ id: c.id }} first={filtered || at === 0} last={filtered || at === all.length - 1} label={c.name} /></div></td>
                      <td>
                        <div className="cat-cell">
                          <img className="thumb" src={img(c.mockupKey || c.coverKey)} alt="" />
                          <div>
                            <div><Link href={`/admin/categories/${c.id}`}>{c.name}</Link>{c.tag && <span className="tag">{c.tag}</span>}</div>
                            <div className="mono">/c/{c.slug}</div>
                          </div>
                        </div>
                      </td>
                      <td>{c.turnaround}</td>
                      <td className="mono"><Link href={`/admin/designs?c=${c.slug}`}>{c.designs}</Link></td>
                      <td className="mono">{c.variants}</td>
                      <td><Switch action={setFlagAction} hidden={{ id: c.id, flag: "showOnHome" }} on={c.showOnHome} label={`Show ${c.name} on home page`} /></td>
                      <td><Switch action={setFlagAction} hidden={{ id: c.id, flag: "active" }} on={c.active} label={`${c.name} visible on site`} /></td>
                      <td>
                        <div className="acts">
                          <Link className="icon-btn" href={`/admin/categories/${c.id}`} aria-label={`Edit ${c.name}`}><IconEdit /></Link>
                          <a className="icon-btn" href={`/c/${c.slug}`} target="_blank" rel="noopener" aria-label={`Open ${c.name} on site`}><IconExternal /></a>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="foot"><span>{rows.length} of {all.length} categories</span><span>{filtered ? "Clear filters to reorder" : "Changes save immediately"}</span></div>
        </section>
      </main>
    </>
  );
}
