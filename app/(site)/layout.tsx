import { EnquiryProvider } from "@/components/enquiry";
import { LegacyHashRedirect } from "@/components/legacy-hash-redirect";
import { SiteFooter, SiteHeader, WhatsAppFab } from "@/components/site-chrome";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <EnquiryProvider>
      <SiteHeader />
      <main className="wrap">{children}</main>
      <SiteFooter />
      <WhatsAppFab />
      <LegacyHashRedirect />
    </EnquiryProvider>
  );
}
