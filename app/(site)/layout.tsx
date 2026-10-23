import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { EnquiryProvider } from "@/components/enquiry";
import { LegacyHashRedirect } from "@/components/legacy-hash-redirect";
import { SiteFooter, SiteHeader, WhatsAppFab } from "@/components/site-chrome";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { loadCategoryCards } from "@/lib/site-data";
import { turnstileKeys } from "@/lib/turnstile";
import "./site.css";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], variable: "--font-jakarta", adjustFontFallback: false, fallback: ["system-ui", "sans-serif"] });

export const metadata: Metadata = {
  title: "Raj Graphics — The Perfection of Printing",
};

export const dynamic = "force-dynamic";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const cards = await loadCategoryCards();
  const siteKey = turnstileKeys(getCloudflareContext().env, process.env.NODE_ENV === "development")?.site ?? null;
  return (
    <html lang="en" className={jakarta.variable} data-scroll-behavior="smooth">
      <body>
        <EnquiryProvider names={cards.map((c) => c.name)} siteKey={siteKey}>
          <SiteHeader />
          <main className="wrap">{children}</main>
          <SiteFooter />
          <WhatsAppFab />
          <LegacyHashRedirect />
        </EnquiryProvider>
      </body>
    </html>
  );
}
