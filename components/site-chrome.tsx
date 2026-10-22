import Link from "next/link";
import { Suspense } from "react";
import { EnquireButton } from "@/components/enquiry";
import { SearchBox, SearchBoxFallback } from "@/components/search-box";
import { waLink } from "@/lib/catalog";

const TRACK = waLink("Hi Raj Graphics, I want to check the status of my order.");

function Brand({ alt }: { alt: string }) {
  return (
    <Link href="/" className="brand"><img src="/img/logo.png" alt={alt} /><span>Raj Graphics<small>THE PERFECTION OF PRINTING</small></span></Link>
  );
}

export function SiteHeader() {
  return (
    <header>
      <div className="wrap hd">
        <Brand alt="Raj Graphics" />
        <Suspense fallback={<SearchBoxFallback />}><SearchBox /></Suspense>
        <nav className="main">
          <Link href="/#products">Products</Link>
          <Link href="/#why">About Us</Link>
          <a href={TRACK} target="_blank" rel="noopener">Track Order</a>
          <Link href="/#contact">Support</Link>
        </nav>
        <a className="wallet" href={waLink()} target="_blank" rel="noopener"><i>💬</i><span>WhatsApp<b>Chat now</b></span></a>
        <EnquireButton className="btn btn-p">＋ Get a Quote</EnquireButton>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer>
      <div className="wrap">
        <div className="ft">
          <div>
            <Brand alt="" />
            <p>Your trusted printing partner for high-quality printing solutions at the best prices. Serving businesses across India.</p>
            <div className="soc"><a href="#" className="s-fb">f</a><a href="#" className="s-ig">◎</a><a href="#" className="s-yt">▶</a><a href="#" className="s-in">in</a></div>
          </div>
          <div>
            <h4>Quick Links</h4>
            <ul>
              <li><Link href="/#products">Products</Link></li>
              <li><a href={TRACK} target="_blank" rel="noopener">Track Order</a></li>
              <li><Link href="/#why">About Us</Link></li>
              <li><EnquireButton link>Contact Us</EnquireButton></li>
            </ul>
          </div>
          <div>
            <h4>Customer Support</h4>
            <ul>
              <li><a href={waLink()} target="_blank" rel="noopener">FAQs</a></li>
              <li><a href={waLink()} target="_blank" rel="noopener">Shipping &amp; Delivery</a></li>
              <li><a href={waLink()} target="_blank" rel="noopener">Return Policy</a></li>
              <li><a href="#">Terms &amp; Conditions</a></li>
              <li><a href="#">Privacy Policy</a></li>
            </ul>
          </div>
          <div>
            <h4>Contact Us</h4>
            <ul><li>📞 +91 98XXX XXXXX</li><li>✉ hello@rajgraphics.in</li><li>📍 City, State, India</li><li>🕘 Mon – Sat: 10:00 AM – 8:00 PM</li></ul>
          </div>
        </div>
        <div className="copy"><span>© 2026 Raj Graphics. All rights reserved.</span><span>Designed for Raj Graphics</span></div>
      </div>
    </footer>
  );
}

export function WhatsAppFab() {
  return (
    <a className="fab" href={waLink()} target="_blank" rel="noopener" aria-label="Chat on WhatsApp">
      <svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm5.3 14.2c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.1-4.6-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.9 0-1.4.7-2 1-2.3.3-.3.6-.3.8-.3h.6c.2 0 .4 0 .6.5l.9 2.1c.1.2.1.4 0 .5l-.3.5-.4.4c-.1.1-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.3 2.4 1.5.3.1.5.1.6-.1l.9-1c.2-.3.4-.2.6-.1l2 1c.3.1.5.2.5.3.1.1.1.7-.1 1.3z" /></svg>
    </a>
  );
}
