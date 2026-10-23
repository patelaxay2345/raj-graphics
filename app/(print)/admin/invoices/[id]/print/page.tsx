import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { InvoiceDoc } from "@/components/invoice-doc";
import { PrintButton } from "@/components/print-button";
import { getDb } from "@/db";
import { docData, getInvoice, invoiceLabel } from "@/lib/admin-invoices";
import { getSeller } from "@/lib/settings";

type Params = { params: Promise<{ id: string }> };

const load = async (id: string) => (/^\d{1,9}$/.test(id) ? getInvoice(getDb(), Number(id)) : undefined);

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const inv = await load((await params).id);
  return { title: inv ? (invoiceLabel(inv) ?? "Draft invoice").replaceAll("/", "-") : "Invoice" };
}

export default async function InvoicePrintPage({ params }: Params) {
  const inv = await load((await params).id);
  if (!inv || inv.status === "draft") notFound();
  return (
    <>
      <div className="print-bar"><PrintButton /></div>
      <main className="print-page"><InvoiceDoc d={docData(inv, await getSeller(getDb()))} /></main>
    </>
  );
}
