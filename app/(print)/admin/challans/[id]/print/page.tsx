import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ChallanDoc } from "@/components/challan-doc";
import { PrintButton } from "@/components/print-button";
import { getDb } from "@/db";
import { challanDocData, challanLabel, getChallan } from "@/lib/admin-challans";
import { getSeller } from "@/lib/settings";

type Params = { params: Promise<{ id: string }> };

const load = async (id: string) => (/^\d{1,9}$/.test(id) ? getChallan(getDb(), Number(id)) : undefined);

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const c = await load((await params).id);
  return { title: c ? (challanLabel(c) ?? "Draft challan").replaceAll("/", "-") : "Challan" };
}

export default async function ChallanPrintPage({ params }: Params) {
  const c = await load((await params).id);
  if (!c || c.status === "draft") notFound();
  const d = challanDocData(c, await getSeller(getDb()));
  return (
    <>
      <div className="print-bar"><PrintButton /></div>
      <main className="print-page inv-copies">
        <ChallanDoc d={d} copy="Customer copy" />
        <ChallanDoc d={d} copy="Office copy" />
      </main>
    </>
  );
}
