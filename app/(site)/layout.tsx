import { EnquiryProvider } from "@/components/enquiry";
import { LegacyHashRedirect } from "@/components/legacy-hash-redirect";
import { SiteFooter, SiteHeader, WhatsAppFab } from "@/components/site-chrome";
import { loadCategoryCards } from "@/lib/site-data";

export const dynamic = "force-dynamic";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const cards = await loadCategoryCards();
  return (
    <EnquiryProvider names={cards.map((c) => c.name)}>
      <SiteHeader />
      <main className="wrap">{children}</main>
      <SiteFooter />
      <WhatsAppFab />
      <LegacyHashRedirect />
    </EnquiryProvider>
  );
}
