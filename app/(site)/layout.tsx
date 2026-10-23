import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { EnquiryProvider } from "@/components/enquiry";
import { LegacyHashRedirect } from "@/components/legacy-hash-redirect";
import { SiteFooter, SiteHeader, WhatsAppFab } from "@/components/site-chrome";
import { loadCategoryCards } from "@/lib/site-data";
import "./site.css";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], variable: "--font-jakarta", adjustFontFallback: false, fallback: ["system-ui", "sans-serif"] });

export const metadata: Metadata = {
  title: "Raj Graphics — The Perfection of Printing",
};

export const dynamic = "force-dynamic";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const cards = await loadCategoryCards();
  return (
    <html lang="en" className={jakarta.variable} data-scroll-behavior="smooth">
      <body>
        <EnquiryProvider names={cards.map((c) => c.name)}>
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
