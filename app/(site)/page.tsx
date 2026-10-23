import Link from "next/link";
import { CatCards } from "@/components/cat-cards";
import { EnquireButton } from "@/components/enquiry";
import { NewsForm } from "@/components/news-form";
import { BEST, CATS, HOME, REVIEWS, findCategory, img, waLink, type Category } from "@/lib/catalog";

export default async function Home({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const q = ((await searchParams).q ?? "").trim().toLowerCase();
  if (q) {
    const list = CATS.filter((c) => c.name.toLowerCase().includes(q));
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
          <span className="pill">👑 Trusted by 45,000+ Customers</span>
          <h1>High-Quality Printing<br /><em>for Every Business</em></h1>
          <p>Premium printing at affordable prices. Share your design, get a quick quote and doorstep delivery – all in one place.</p>
          <div className="ctas">
            <EnquireButton className="btn btn-p">Get a Quote →</EnquireButton>
            <a className="btn btn-o" href={waLink()} target="_blank" rel="noopener">💬 Chat on WhatsApp</a>
          </div>
          <div className="feats">
            <div><i className="i-violet">⚡</i><span><b>12 Hours</b>Fastest Turnaround</span></div>
            <div><i className="i-green">🛡️</i><span><b>Premium Quality</b>Professional Printing</span></div>
            <div><i className="i-blue">🚚</i><span><b>Pan India</b>Safe Delivery</span></div>
            <div><i className="i-peach">👥</i><span><b>45,000+</b>Happy Customers</span></div>
          </div>
        </div>
        <div className="hero-art"><img src={img("m-hero")} alt="Raj Graphics printed products" /></div>
      </section>

      <div className="sec" id="products">
        <div><h2>Shop by Category</h2><p>Choose from a wide range of printing products. Great quality, best prices and fast delivery.</p></div>
        <Link className="btn btn-o" href="/c/visiting-cards">View All Products →</Link>
      </div>
      <div className="cats cats4"><CatCards list={HOME.map(findCategory).filter((c): c is Category => !!c)} /></div>

      <section className="band" id="why">
        <div className="sec"><div><h2>Why Choose Raj Graphics?</h2><p>We make printing simple, fast and hassle-free for businesses of all sizes.</p></div></div>
        <div className="why4">
          <div><i className="c0">🛍️</i><span><b>Best Prices</b>High-quality printing at competitive rates</span></div>
          <div><i className="c3">⚡</i><span><b>Fast Turnaround</b>Get your orders ready in 12 hours</span></div>
          <div><i className="c2">🛡️</i><span><b>Premium Quality</b>State-of-the-art printing machines for perfect results</span></div>
          <div><i className="i-orange">🚚</i><span><b>Pan India Delivery</b>Safe and reliable delivery to your doorstep</span></div>
        </div>
      </section>

      <div className="sec" id="how"><div><h2>How It Works</h2><p>Getting your prints is quick and easy.</p></div></div>
      <div className="flow">
        <div><i className="c0">🛒</i><b>1. Choose Product</b>Select from our wide range of printing products</div>
        <div><i className="c4">☁️</i><b>2. Share Design</b>Send your artwork or use our design help</div>
        <div><i className="c2">🧾</i><b>3. Get Your Quote</b>We share price and delivery time on enquiry</div>
        <div><i className="c3">💬</i><b>4. Confirm Enquiry</b>Approve the proof on call or WhatsApp</div>
        <div><i className="i-rose">🚚</i><b>5. Receive Prints</b>High-quality prints delivered to your doorstep</div>
      </div>

      <section className="custom">
        <div>
          <h2>Custom Printing<br /><em>for Your Brand</em></h2>
          <p>Make a lasting impression with professional printing solutions.</p>
          <EnquireButton className="btn btn-p" product="Custom printing">Start Customized Enquiry →</EnquireButton>
        </div>
        <img src={img("m-custom")} alt="Custom branded bag, cup, box and notebook" />
        <ul className="checks"><li>Custom Sizes &amp; Shapes</li><li>Multiple Paper Options</li><li>Bulk Order Discounts</li><li>Design Support Available</li></ul>
      </section>

      <div className="sec">
        <div><h2>Best Selling Products</h2><p>Most popular products loved by our customers.</p></div>
        <Link className="btn btn-o" href="/c/visiting-cards">View All Best Sellers →</Link>
      </div>
      <div className="cats">
        {BEST.map(([n, m], i) => (
          <EnquireButton key={n} link className="cat" product={n} image={m}>
            <div className={`ph c${i % 5}`}><img loading="lazy" src={img(m)} alt={n} /></div>
            <div className="bd"><h3>{n}</h3><span className="go">→</span><div className="meta"><b>Get a quote</b></div></div>
          </EnquireButton>
        ))}
      </div>

      <section className="band">
        <div className="sec center">
          <div><h2>What Our Customers Say</h2><p>Trusted by 45,000+ businesses across India.</p></div>
          <div className="arrows"><button aria-label="Previous">‹</button><button aria-label="Next">›</button></div>
        </div>
        <div className="reviews">
          {REVIEWS.map(([t, n, r]) => (
            <div key={n} className="rv">
              <q>{t}</q>
              <div className="stars">★★★★★</div>
              <div className="who"><i>{n.split(" ").map((w) => w[0]).join("")}</i><span><b>{n}</b>{r}</span></div>
            </div>
          ))}
        </div>
      </section>

      <section className="news">
        <div><h3>Get Updates on Offers &amp; New Products</h3><p>Subscribe to get the latest offers, printing tips and new product updates.</p></div>
        <NewsForm />
      </section>
    </>
  );
}
