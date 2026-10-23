import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CatCards } from "@/components/cat-cards";
import { ChipNav } from "@/components/chip-nav";
import { Contact } from "@/components/contact";
import { EnquireButton } from "@/components/enquiry";
import { ShowAll } from "@/components/show-all";
import { CATS, TPL, TPL_PAGE, V, findCategory, img, variantImg, waLink } from "@/lib/catalog";

type Params = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export const generateStaticParams = () => CATS.map((c) => ({ slug: c.slug }));

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const c = findCategory((await params).slug);
  return { title: `${c?.name} — Raj Graphics` };
}

export default async function CategoryPage({ params }: Params) {
  const c = findCategory((await params).slug);
  if (!c) notFound();

  const tpls = TPL[c.slug] || [];
  const variants = (V[c.slug] || []).map(([t, f, im], j) => ({ t, f, img: variantImg(c, im, j) }));
  const designs = tpls.reduce((a, t) => a + t.items.length, 0);
  const groupTitle = `${c.name} variants`;
  const tabs: [string, string][] = [...tpls.map((t, i): [string, string] => [`t${i}`, t.g]), ...(variants.length ? [["g0", groupTitle] as [string, string]] : [])];
  const others = CATS.filter((x) => x.slug !== c.slug && x.m).slice(0, 5);
  const [first, ...rest] = c.name.split(" ");

  return (
    <>
      <section className="lhero">
        <div>
          <div className="crumb"><Link href="/">Home</Link> / <Link href="/#products">Products</Link> / {c.name}</div>
          <span className="pill">✨ {variants.length + designs} options available</span>
          <h1>{rest.length ? <>{first} <em>{rest.join(" ")}</em></> : <em>{first}</em>}</h1>
          <p>Premium {c.name.toLowerCase()} with a free design check and fast turnaround. Share your requirement and get a quote in minutes.</p>
          <div className="ctas">
            <EnquireButton className="btn btn-p" product={c.name}>Get a Quote →</EnquireButton>
            <a className="btn btn-o" href={waLink()} target="_blank" rel="noopener">💬 Chat on WhatsApp</a>
          </div>
          <div className="feats">
            <div><i className="i-violet">⏱</i><span><b>{c.days}</b>Turnaround</span></div>
            <div><i className="i-green">🛡️</i><span><b>Free Check</b>Before every print</span></div>
            <div><i className="i-blue">🚚</i><span><b>Pan India</b>Safe delivery</span></div>
          </div>
        </div>
        <div className="art"><img className={c.m ? "m" : undefined} src={img(c.m || c.img)} alt={c.name} /></div>
      </section>

      {tabs.length > 1 && <ChipNav tabs={tabs} />}

      {tpls.map((t, i) => {
        const off = tpls.slice(0, i).reduce((a, x) => a + x.items.length, 0);
        return (
          <section key={t.g} className="grp" id={`t${i}`}>
            <div className="grp-h">
              <div><h2>{t.g}</h2><p>{t.items.length} ready designs · we customise with your details</p></div>
              <span className="qty">Free customisation</span>
            </div>
            <ShowAll total={t.items.length} page={TPL_PAGE}>
              {t.items.map(([n, src], j) => (
                <Link key={src} className="tpl" href={`/p/${c.slug}/${off + j}`}>
                  <div className={`ph c${j % 5}`}><img loading="lazy" src={src} alt={n} /></div>
                  <div className="bd"><span title={n}>{n}</span><span className="go-v">View →</span></div>
                </Link>
              ))}
            </ShowAll>
          </section>
        );
      })}

      {variants.length > 0 && (
        <section className="grp" id="g0">
          <div className="grp-h">
            <div><h2>{groupTitle}</h2><p>{variants.length} options · price shared on enquiry</p></div>
            <span className="qty">Custom quantity</span>
          </div>
          <div className="prods">
            {variants.map((p, j) => (
              <Link key={p.t} className="prod" href={`/p/${c.slug}/${designs + j}`}>
                <div className="media"><img loading="lazy" src={img(p.img)} alt={p.t} className={/^(\/img\/t\/|m-|cover\/)/.test(p.img) ? `fit c${j % 5}` : undefined} /></div>
                <div className="bd">
                  <h3>{p.t}</h3>
                  <span className="feat">{p.f}</span>
                  <div className="row"><span className="time">⏱ {c.days}</span><span className="enq">View →</span></div>
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
