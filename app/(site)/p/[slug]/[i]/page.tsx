import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Contact } from "@/components/contact";
import { EnquireButton } from "@/components/enquiry";
import { CATS, V, findCategory, img, products, waLink } from "@/lib/catalog";

type Params = { params: Promise<{ slug: string; i: string }> };

export const dynamicParams = false;

export const generateStaticParams = () => CATS.flatMap((c) => products(c).map((_, i) => ({ slug: c.slug, i: String(i) })));

const load = async (params: Params["params"]) => {
  const { slug, i } = await params;
  const c = findCategory(slug);
  const list = c ? products(c) : [];
  const n = Number(i);
  return c && list[n] ? { c, list, n, p: list[n] } : undefined;
};

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const d = await load(params);
  return { title: d && `${d.p.t} — ${d.c.name} — Raj Graphics` };
}

export default async function ProductPage({ params }: Params) {
  const d = await load(params);
  if (!d) notFound();
  const { c, list, n, p } = d;

  const label = `${c.name} – ${p.design ? "design " : ""}${p.t}`;
  const related = list.map((x, k) => ({ ...x, k })).filter((x) => x.group === p.group && x.k !== n).slice(0, 4);
  const opts = (V[c.slug] || []).map((v) => v[0]);

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
            <div><b>{c.days}</b>Turnaround</div>
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
            <a className="btn btn-o" href={waLink(`Hi Raj Graphics, I'm interested in ${label}.`)} target="_blank" rel="noopener">💬 WhatsApp</a>
          </div>
          <div className="pn">
            {n > 0 ? <Link className="btn btn-o" href={`/p/${c.slug}/${n - 1}`}>← {list[n - 1].t}</Link> : <span />}
            {n < list.length - 1 && <Link className="btn btn-o" href={`/p/${c.slug}/${n + 1}`}>{list[n + 1].t} →</Link>}
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
              <Link key={r.k} className="tpl" href={`/p/${c.slug}/${r.k}`}>
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
