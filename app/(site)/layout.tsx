import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { EnquiryProvider } from "@/components/enquiry";
import { LegacyHashRedirect } from "@/components/legacy-hash-redirect";
import { SiteFooter, SiteHeader, WhatsAppFab } from "@/components/site-chrome";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { loadCategoryCards, loadStore } from "@/lib/site-data";
import { turnstileKeys } from "@/lib/turnstile";
import "./site.css";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], variable: "--font-jakarta", adjustFontFallback: false, fallback: ["system-ui", "sans-serif"] });

export async function generateMetadata(): Promise<Metadata> {
  const store = await loadStore();
  return { title: store.seoTitle, description: store.seoDescription || undefined };
}

export const dynamic = "force-dynamic";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [cards, store] = await Promise.all([loadCategoryCards(), loadStore()]);
  const siteKey = turnstileKeys(getCloudflareContext().env, process.env.NODE_ENV === "development")?.site ?? null;
  return (
    <html lang="en" className={jakarta.variable} data-scroll-behavior="smooth">
      <body>
        <EnquiryProvider names={cards.map((c) => c.name)} siteKey={siteKey} wa={store.whatsapp}>
          <SiteHeader store={store} />
          <main className="wrap">{children}</main>
          <SiteFooter store={store} />
          <WhatsAppFab store={store} />
          <LegacyHashRedirect />
        </EnquiryProvider>
      </body>
    </html>
  );
}
