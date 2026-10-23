import Link from "next/link";
import { CatCards } from "@/components/cat-cards";
import { EnquireButton } from "@/components/enquiry";
import { NewsForm } from "@/components/news-form";
import { homeCards } from "@/lib/catalog";
import { bestSellers } from "@/lib/home";
import { img, waLink } from "@/lib/site";
import { loadCategoryCards, loadHome, loadStore } from "@/lib/site-data";

const FEAT_ICONS = [["i-violet", "⚡"], ["i-green", "🛡️"], ["i-blue", "🚚"], ["i-peach", "👥"]];
const WHY_ICONS = [["c0", "🛍️"], ["c3", "⚡"], ["c2", "🛡️"], ["i-orange", "🚚"]];
const HOW_ICONS = [["c0", "🛒"], ["c4", "☁️"], ["c2", "🧾"], ["c3", "💬"], ["i-rose", "🚚"]];

export default async function Home({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const q = ((await searchParams).q ?? "").trim().toLowerCase();
  const [cards, store, { home, reviews }] = await Promise.all([loadCategoryCards(), loadStore(), loadHome()]);
  const best = bestSellers(home);
  if (q) {
    const list = cards.filter((c) => c.name.toLowerCase().includes(q));
    return (
      <>
        <div className="sec"><div><h2>Results for “{q}”</h2></div></div>
        <div className="cats">
          {list.length ? <CatCards list={list} /> : <p>No match. <EnquireButton link className="lnk">Ask us →</EnquireButton></p>}
        </div>
      </>
    );
  }

  return (
    <>
      <section className="hero">
        <div>
          {home.hero.pill && <span className="pill">{home.hero.pill}</span>}
          <h1>{home.hero.title}{home.hero.highlight && <><br /><em>{home.hero.highlight}</em></>}</h1>
          {home.hero.text && <p>{home.hero.text}</p>}
          <div className="ctas">
            <EnquireButton className="btn btn-p">Get a Quote →</EnquireButton>
            <a className="btn btn-o" href={waLink(store.whatsapp)} target="_blank" rel="noopener">💬 Chat on WhatsApp</a>
          </div>
          <div className="feats">
            {home.hero.feats.map((f, i) => <div key={i}><i className={FEAT_ICONS[i][0]}>{FEAT_ICONS[i][1]}</i><span><b>{f.value}</b>{f.label}</span></div>)}
          </div>
        </div>
        <div className="hero-art"><img src={img(home.hero.imageKey)} alt={`${store.name} printed products`} /></div>
      </section>

      <div className="sec" id="products">
        <div><h2>{home.products.title}</h2>{home.products.subtitle && <p>{home.products.subtitle}</p>}</div>
        <Link className="btn btn-o" href="/c/visiting-cards">View All Products →</Link>
      </div>
      <div className="cats cats4"><CatCards list={homeCards(cards)} /></div>

      <section className="band" id="why">
        <div className="sec"><div><h2>{home.why.title}</h2>{home.why.subtitle && <p>{home.why.subtitle}</p>}</div></div>
        <div className="why4">
          {home.why.items.map((w, i) => <div key={i}><i className={WHY_ICONS[i][0]}>{WHY_ICONS[i][1]}</i><span><b>{w.title}</b>{w.text}</span></div>)}
        </div>
      </section>

      <div className="sec" id="how"><div><h2>{home.how.title}</h2>{home.how.subtitle && <p>{home.how.subtitle}</p>}</div></div>
      <div className="flow">
        {home.how.steps.map((s, i) => <div key={i}><i className={HOW_ICONS[i][0]}>{HOW_ICONS[i][1]}</i><b>{i + 1}. {s.title}</b>{s.text}</div>)}
      </div>

      <section className="custom">
        <div>
          <h2>{home.custom.title}{home.custom.highlight && <><br /><em>{home.custom.highlight}</em></>}</h2>
          {home.custom.text && <p>{home.custom.text}</p>}
          <EnquireButton className="btn btn-p" product="Custom printing">{home.custom.button}</EnquireButton>
        </div>
        <img src={img("m-custom.jpg")} alt="Custom branded bag, cup, box and notebook" />
        <ul className="checks">{home.custom.checks.filter(Boolean).map((c) => <li key={c}>{c}</li>)}</ul>
      </section>

      {best.length > 0 && <>
      <div className="sec">
        <div><h2>{home.best.title}</h2>{home.best.subtitle && <p>{home.best.subtitle}</p>}</div>
        <Link className="btn btn-o" href="/c/visiting-cards">View All Best Sellers →</Link>
      </div>
      <div className="cats">
        {best.map(({ name: n, imageKey: m }, i) => (
          <EnquireButton key={n} link className="cat" product={n} image={m}>
            <div className={`ph c${i % 5}`}><img loading="lazy" src={img(m)} alt={n} /></div>
            <div className="bd"><h3>{n}</h3><span className="go">→</span><div className="meta"><b>Get a quote</b></div></div>
          </EnquireButton>
        ))}
      </div>
      </>}

      {reviews.length > 0 && <section className="band">
        <div className="sec center">
          <div><h2>{home.reviews.title}</h2>{home.reviews.subtitle && <p>{home.reviews.subtitle}</p>}</div>
          <div className="arrows"><button aria-label="Previous">‹</button><button aria-label="Next">›</button></div>
        </div>
        <div className="reviews">
          {reviews.map((r) => (
            <div key={r.id} className="rv">
              <q>{r.quote}</q>
              <div className="stars">★★★★★</div>
              <div className="who"><i>{r.name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase()}</i><span><b>{r.name}</b>{r.role}</span></div>
            </div>
          ))}
        </div>
      </section>}

      <section className="news">
        <div><h3>Get Updates on Offers &amp; New Products</h3><p>Subscribe to get the latest offers, printing tips and new product updates.</p></div>
        <NewsForm />
      </section>
    </>
  );
}
