import Link from "next/link";
import { Suspense } from "react";
import { EnquireButton } from "@/components/enquiry";
import { SearchBox, SearchBoxFallback } from "@/components/search-box";
import { waLink } from "@/lib/site";
import type { Store } from "@/lib/settings";

const track = (s: Store) => waLink(s.whatsapp, `Hi ${s.name}, I want to check the status of my order.`);

function Brand({ store, alt }: { store: Store; alt: string }) {
  return (
    <Link href="/" className="brand"><img src="/logo.png" alt={alt} /><span>{store.name}{store.tagline && <small>{store.tagline}</small>}</span></Link>
  );
}

export function SiteHeader({ store }: { store: Store }) {
  return (
    <header>
      <div className="wrap hd">
        <Brand store={store} alt={store.name} />
        <Suspense fallback={<SearchBoxFallback />}><SearchBox /></Suspense>
        <nav className="main">
          <Link href="/#products">Products</Link>
          <Link href="/#why">About Us</Link>
          <a href={track(store)} target="_blank" rel="noopener">Track Order</a>
          <Link href="/#contact">Support</Link>
        </nav>
        <a className="wallet" href={waLink(store.whatsapp)} target="_blank" rel="noopener"><i>💬</i><span>WhatsApp<b>Chat now</b></span></a>
        <EnquireButton className="btn btn-p">＋ Get a Quote</EnquireButton>
      </div>
    </header>
  );
}

export function SiteFooter({ store }: { store: Store }) {
  const social = ([["facebook", "s-fb", "f", "Facebook"], ["instagram", "s-ig", "◎", "Instagram"], ["youtube", "s-yt", "▶", "YouTube"], ["linkedin", "s-in", "in", "LinkedIn"]] as const).filter(([k]) => store[k]);
  return (
    <footer>
      <div className="wrap">
        <div className="ft">
          <div>
            <Brand store={store} alt="" />
            {store.about && <p>{store.about}</p>}
            {social.length > 0 && <div className="soc">{social.map(([k, cls, glyph, label]) => <a key={k} href={store[k]} className={cls} target="_blank" rel="noopener" aria-label={label}>{glyph}</a>)}</div>}
          </div>
          <div>
            <h4>Quick Links</h4>
            <ul>
              <li><Link href="/#products">Products</Link></li>
              <li><a href={track(store)} target="_blank" rel="noopener">Track Order</a></li>
              <li><Link href="/#why">About Us</Link></li>
              <li><EnquireButton link>Contact Us</EnquireButton></li>
            </ul>
          </div>
          <div>
            <h4>Customer Support</h4>
            <ul>
              <li><a href={waLink(store.whatsapp)} target="_blank" rel="noopener">FAQs</a></li>
              <li><a href={waLink(store.whatsapp)} target="_blank" rel="noopener">Shipping &amp; Delivery</a></li>
              <li><a href={waLink(store.whatsapp)} target="_blank" rel="noopener">Return Policy</a></li>
              <li><a href="#">Terms &amp; Conditions</a></li>
              <li><a href="#">Privacy Policy</a></li>
            </ul>
          </div>
          <div>
            <h4>Contact Us</h4>
            <ul>{store.phone && <li>📞 {store.phone}</li>}{store.email && <li>✉ {store.email}</li>}{store.address && <li>📍 {store.address}</li>}{store.hours && <li>🕘 {store.hours}</li>}</ul>
          </div>
        </div>
        <div className="copy"><span>© {new Date().getFullYear()} {store.name}. All rights reserved.</span><span>Designed for {store.name}</span></div>
      </div>
    </footer>
  );
}

export function WhatsAppFab({ store }: { store: Store }) {
  return (
    <a className="fab" href={waLink(store.whatsapp)} target="_blank" rel="noopener" aria-label="Chat on WhatsApp">
      <svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm5.3 14.2c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.1-4.6-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.9 0-1.4.7-2 1-2.3.3-.3.6-.3.8-.3h.6c.2 0 .4 0 .6.5l.9 2.1c.1.2.1.4 0 .5l-.3.5-.4.4c-.1.1-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.3 2.4 1.5.3.1.5.1.6-.1l.9-1c.2-.3.4-.2.6-.1l2 1c.3.1.5.2.5.3.1.1.1.7-.1 1.3z" /></svg>
    </a>
  );
}
