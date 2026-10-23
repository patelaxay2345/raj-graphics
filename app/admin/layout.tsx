import type { Metadata } from "next";
import { requireOwner } from "@/lib/owner";

export const metadata: Metadata = { title: "Admin — Raj Graphics", robots: { index: false, follow: false } };

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireOwner();
  return children;
}
