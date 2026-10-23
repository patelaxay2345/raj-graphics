import Link from "next/link";
import { notFound } from "next/navigation";
import { TopBar } from "@/components/admin/top-bar";
import { Uploader } from "@/components/admin/uploader";
import { getDb } from "@/db";
import { getDesignCategory, listDesignCategories } from "@/lib/admin-catalog";
import { img } from "@/lib/site";

export default async function DesignsPage({ searchParams }: { searchParams: Promise<{ c?: string; g?: string }> }) {
  const db = getDb();
  const sp = await searchParams;
  const cats = await listDesignCategories(db);
  const total = cats.reduce((a, c) => a + c.designs, 0);
  const slug = sp.c ?? cats.find((c) => c.designs)?.slug ?? cats[0]?.slug;
  const cat = slug ? await getDesignCategory(db, slug) : undefined;
  if (slug && !cat) notFound();
  const group = cat?.groups.find((g) => String(g.id) === sp.g) ?? cat?.groups[0];

  return (
    <>
      <TopBar crumbs={["Catalog", "Designs"]} />
      <main className="main">
        <div className="head">
          <div><h1>Designs</h1><p>Ready-made designs customers pick on the site. {total} designs in {cats.filter((c) => c.designs).length} categories.</p></div>
        </div>

        <nav aria-label="Category" className="chips">
          {cats.map((c) => (
            <Link key={c.id} href={`/admin/designs?c=${c.slug}`} className={c.slug === cat?.slug ? "chip on" : "chip"} aria-current={c.slug === cat?.slug ? "page" : undefined}>
              {c.name} <span className="mono">{c.designs}</span>
            </Link>
          ))}
        </nav>

        {cat && cat.groups.length > 1 && (
          <nav aria-label="Design group" className="chips">
            {cat.groups.map((g) => (
              <Link key={g.id} href={`/admin/designs?c=${cat.slug}&g=${g.id}`} className={g.id === group?.id ? "chip on" : "chip"} aria-current={g.id === group?.id ? "page" : undefined}>
                {g.title} <span className="mono">{g.designs.length}</span>
              </Link>
            ))}
          </nav>
        )}

        {cat && group ? (
          <>
            <section className="card">
              <div className="card-hd">
                <h2>Bulk upload · {group.title}</h2>
                <span>Next code {cat.designPrefix}{cat.nextDesignNo} · thumbnails made in the browser (360 px WebP)</span>
              </div>
              <Uploader groupId={group.id} groupTitle={group.title} />
            </section>

            <section className="card">
              <div className="card-hd"><h2>{group.title}</h2><span>{group.designs.length} designs</span></div>
              {group.designs.length ? (
                <div className="grid">
                  {group.designs.map((d) => (
                    <figure key={d.id} className={d.active ? "tile" : "tile hid"}>
                      <img src={img(d.imageKey)} alt={`Design ${d.code}`} loading="lazy" />
                      <small><span className="mono">{d.code}</span>{!d.active && <span>Hidden</span>}</small>
                    </figure>
                  ))}
                </div>
              ) : (
                <p className="empty">No designs in this group yet. Upload some above.</p>
              )}
            </section>
          </>
        ) : (
          <section className="card"><p className="empty">{cat ? `${cat.name} has no design groups yet. Groups are added from the category editor.` : "No categories yet."}</p></section>
        )}
      </main>
    </>
  );
}
