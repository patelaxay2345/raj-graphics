import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { Contact } from "@/components/contact";
import { EnquireButton } from "@/components/enquiry";
import { products, type CategoryDetail, type Product } from "@/lib/catalog";
import { img, waLink } from "@/lib/site";
import { loadCategory, loadStore } from "@/lib/site-data";

type Params = { params: Promise<{ slug: string; item: string }> };

type Loaded = { redirect: string } | { c: CategoryDetail; list: Product[]; n: number; p: Product };

const load = async (params: Params["params"]): Promise<Loaded | undefined> => {
  const { slug, item } = await params;
  const c = await loadCategory(slug);
  if (!c) return undefined;
  const list = products(c);
  if (/^\d+$/.test(item)) {
    const legacy = list[Number(item)];
    return legacy && { redirect: `/p/${c.slug}/${legacy.key}` };
  }
  const n = list.findIndex((p) => p.key === item);
  return n < 0 ? undefined : { c, list, n, p: list[n] };
};

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const [d, store] = await Promise.all([load(params), loadStore()]);
  return { title: d && "p" in d ? `${d.p.t} — ${d.c.name} — ${store.name}` : undefined };
}

export default async function ProductPage({ params }: Params) {
  const [d, store] = await Promise.all([load(params), loadStore()]);
  if (!d) notFound();
  if ("redirect" in d) permanentRedirect(d.redirect);
  const { c, list, n, p } = d;

  const label = `${c.name} – ${p.design ? "design " : ""}${p.t}`;
  const related = list.map((x, k) => ({ ...x, k })).filter((x) => x.group === p.group && x.k !== n).slice(0, 4);
  const opts = c.variants.map((v) => v.title);

  return (
    <>
      <div className="crumb top"><Link href="/">Home</Link> / <Link href={`/c/${c.slug}`}>{c.name}</Link> / {p.t}</div>
      <section className="pd">
        <div className={`pd-img c${n % 5}`}><img src={img(p.img)} alt={p.t} /></div>
        <div>
          <span className="pill">{p.design ? "🎨 Ready design" : "✨ Product variant"} · {p.group}</span>
          <h1>{p.t}</h1>
          <div className="sub">{c.name}</div>
          <p className="desc">{p.f || `A ready-made ${c.name.toLowerCase()} design. We customise it with your name, logo and contact details for free, check the file, and print it on the paper and finish you choose.`}</p>
          <div className="specs">
            <div><b>{c.turnaround}</b>Turnaround</div>
            <div><b>{p.design ? "Free" : "Available"}</b>{p.design ? "Design customisation" : "Design support"}</div>
            <div><b>On enquiry</b>Price &amp; quantity</div>
            <div><b>Pan India</b>Safe delivery</div>
          </div>
          {opts.length > 0 && (
            <>
              <h4>Available options</h4>
              <div className="optl">{opts.map((o) => <span key={o}>{o}</span>)}</div>
            </>
          )}
          <div className="ctas">
            <EnquireButton className="btn btn-p" product={label} image={p.img}>Enquire Now →</EnquireButton>
            <a className="btn btn-o" href={waLink(store.whatsapp, `Hi ${store.name}, I'm interested in ${label}.`)} target="_blank" rel="noopener">💬 WhatsApp</a>
          </div>
          <div className="pn">
            {n > 0 ? <Link className="btn btn-o" href={`/p/${c.slug}/${list[n - 1].key}`}>← {list[n - 1].t}</Link> : <span />}
            {n < list.length - 1 && <Link className="btn btn-o" href={`/p/${c.slug}/${list[n + 1].key}`}>{list[n + 1].t} →</Link>}
          </div>
        </div>
      </section>
      {related.length > 0 && (
        <>
          <div className="sec">
            <div><h2>More {p.group}</h2><p>Similar options from {c.name}.</p></div>
            <Link className="btn btn-o" href={`/c/${c.slug}`}>View all →</Link>
          </div>
          <div className="tpls">
            {related.map((r) => (
              <Link key={r.key} className="tpl" href={`/p/${c.slug}/${r.key}`}>
                <div className={`ph c${r.k % 5}`}><img loading="lazy" src={img(r.img)} alt={r.t} /></div>
                <div className="bd"><span>{r.t}</span><span className="go-v">View →</span></div>
              </Link>
            ))}
          </div>
        </>
      )}
      <Contact />
    </>
  );
}
