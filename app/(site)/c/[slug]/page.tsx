import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CatCards } from "@/components/cat-cards";
import { ChipNav } from "@/components/chip-nav";
import { Contact } from "@/components/contact";
import { EnquireButton } from "@/components/enquiry";
import { ShowAll } from "@/components/show-all";
import { TPL_PAGE, img, isFitImage, waLink } from "@/lib/site";
import { loadCategory, loadCategoryCards } from "@/lib/site-data";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const c = await loadCategory((await params).slug);
  return { title: c && `${c.name} — Raj Graphics` };
}

export default async function CategoryPage({ params }: Params) {
  const c = await loadCategory((await params).slug);
  if (!c) notFound();

  const designs = c.groups.reduce((a, g) => a + g.designs.length, 0);
  const groupTitle = `${c.name} variants`;
  const tabs: [string, string][] = [...c.groups.map((g, i): [string, string] => [`t${i}`, g.title]), ...(c.variants.length ? [["g0", groupTitle] as [string, string]] : [])];
  const others = (await loadCategoryCards()).filter((x) => x.slug !== c.slug && x.mockupKey).slice(0, 5);
  const [first, ...rest] = c.name.split(" ");

  return (
    <>
      <section className="lhero">
        <div>
          <div className="crumb"><Link href="/">Home</Link> / <Link href="/#products">Products</Link> / {c.name}</div>
          <span className="pill">✨ {c.variants.length + designs} options available</span>
          <h1>{rest.length ? <>{first} <em>{rest.join(" ")}</em></> : <em>{first}</em>}</h1>
          <p>{c.description || `Premium ${c.name.toLowerCase()} with a free design check and fast turnaround. Share your requirement and get a quote in minutes.`}</p>
          <div className="ctas">
            <EnquireButton className="btn btn-p" product={c.name}>Get a Quote →</EnquireButton>
            <a className="btn btn-o" href={waLink()} target="_blank" rel="noopener">💬 Chat on WhatsApp</a>
          </div>
          <div className="feats">
            <div><i className="i-violet">⏱</i><span><b>{c.turnaround}</b>Turnaround</span></div>
            <div><i className="i-green">🛡️</i><span><b>Free Check</b>Before every print</span></div>
            <div><i className="i-blue">🚚</i><span><b>Pan India</b>Safe delivery</span></div>
          </div>
        </div>
        <div className="art"><img className={c.mockupKey ? "m" : undefined} src={img(c.mockupKey || c.coverKey)} alt={c.name} /></div>
      </section>

      {tabs.length > 1 && <ChipNav tabs={tabs} />}

      {c.groups.map((g, i) => (
        <section key={g.id} className="grp" id={`t${i}`}>
          <div className="grp-h">
            <div><h2>{g.title}</h2><p>{g.designs.length} ready designs · we customise with your details</p></div>
            <span className="qty">Free customisation</span>
          </div>
          <ShowAll total={g.designs.length} page={TPL_PAGE}>
            {g.designs.map((d, j) => (
              <Link key={d.id} className="tpl" href={`/p/${c.slug}/d${d.id}`}>
                <div className={`ph c${j % 5}`}><img loading="lazy" src={img(d.imageKey)} alt={d.code} /></div>
                <div className="bd"><span title={d.code}>{d.code}</span><span className="go-v">View →</span></div>
              </Link>
            ))}
          </ShowAll>
        </section>
      ))}

      {c.variants.length > 0 && (
        <section className="grp" id="g0">
          <div className="grp-h">
            <div><h2>{groupTitle}</h2><p>{c.variants.length} options · price shared on enquiry</p></div>
            <span className="qty">Custom quantity</span>
          </div>
          <div className="prods">
            {c.variants.map((v, j) => (
              <Link key={v.id} className="prod" href={`/p/${c.slug}/v${v.id}`}>
                <div className="media"><img loading="lazy" src={img(v.img)} alt={v.title} className={isFitImage(v.img) ? `fit c${j % 5}` : undefined} /></div>
                <div className="bd">
                  <h3>{v.title}</h3>
                  <span className="feat">{v.feature}</span>
                  <div className="row"><span className="time">⏱ {c.turnaround}</span><span className="enq">View →</span></div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="sec">
        <div><h2>Explore More Categories</h2><p>Everything your business needs, printed under one roof.</p></div>
        <Link className="btn btn-o" href="/#products">View All Products →</Link>
      </div>
      <div className="cats"><CatCards list={others} /></div>
      <Contact />
    </>
  );
}
