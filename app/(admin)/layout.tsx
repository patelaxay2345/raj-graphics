import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AdminNav } from "@/components/admin/nav";
import { requireOwner } from "@/lib/owner";
import "./admin.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

export const metadata: Metadata = { title: "Admin — Raj Graphics", robots: { index: false, follow: false } };

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const email = await requireOwner();
  return (
    <html lang="en" className={`${geist.variable} ${geistMono.variable}`}>
      <body>
        <div className="shell">
          <aside className="side">
            <a className="brand" href="/admin"><img src="/logo.png" alt="" /><span><b>Raj Graphics</b><small>Printing press admin</small></span></a>
            <AdminNav />
            <div className="who"><i>{email[0].toUpperCase()}</i><span>{email}</span></div>
          </aside>
          <div className="body">{children}</div>
        </div>
      </body>
    </html>
  );
}
