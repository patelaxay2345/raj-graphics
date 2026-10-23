import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/admin/action-form";
import { ChallanEditor } from "@/components/admin/challan-editor";
import { HiddenFields } from "@/components/admin/controls";
import { IconBack, IconExternal, IconTrash } from "@/components/admin/icons";
import { TopBar } from "@/components/admin/top-bar";
import { ChallanDoc } from "@/components/challan-doc";
import { getDb } from "@/db";
import { challanDocData, getChallan } from "@/lib/admin-challans";
import { orderNo } from "@/lib/order-format";
import { getSeller } from "@/lib/settings";
import { deleteChallanAction, setDeliveredAction } from "../actions";

const STATUS = { draft: ["b-lost", "Draft"], issued: ["b-quoted", "Not delivered"], delivered: ["b-won", "Delivered"] } as const;

export default async function ChallanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const c = /^\d{1,9}$/.test(id) ? await getChallan(db, Number(id)) : undefined;
  if (!c) notFound();
  const doc = challanDocData(c, await getSeller(db));
  const [cls, label] = STATUS[c.status];

  return (
    <>
      <TopBar crumbs={["Sales", "Challans", doc.no ?? "Draft"]} />
      <main className="main">
        <div className="head">
          <div>
            <Link className="back" href="/admin/challans"><IconBack />Challans</Link>
            <h1>Delivery challan <span className="mono">{doc.no ?? "draft"}</span> <span className={`b ${cls}`}><i />{label}</span></h1>
            <p>Goods sent with the delivery, no prices. From order <Link className="mono" href={`/admin/orders/${c.order.id}`}>{orderNo(c.order.no)}</Link>.</p>
          </div>
          <div className="acts gap">
            {c.status === "draft" ? (
              <ActionForm action={deleteChallanAction} confirm="Delete this draft challan?">
                <HiddenFields id={c.id} />
                <button className="btn btn-o btn-danger"><IconTrash />Delete draft</button>
              </ActionForm>
            ) : (
              <>
                <a className="btn btn-o" href={`/admin/challans/${c.id}/print`} target="_blank" rel="noopener"><IconExternal />Print / PDF</a>
                <ActionForm action={setDeliveredAction}>
                  <HiddenFields id={c.id} on={String(c.status === "issued")} />
                  <button className={c.status === "issued" ? "btn btn-p" : "btn btn-o"}>{c.status === "issued" ? "Mark delivered" : "Mark not delivered"}</button>
                </ActionForm>
              </>
            )}
          </div>
        </div>

        {c.status === "draft" ? (
          <ChallanEditor
            id={c.id}
            doc={{ no: null, issuedOn: null, orderNo: doc.orderNo, seller: doc.seller }}
            initial={{
              deliverTo: c.deliverTo,
              phone: c.phone,
              address: c.address,
              mode: c.mode,
              vehicle: c.vehicle,
              purpose: c.purpose,
              returnable: c.returnable,
              items: c.items.map((i) => ({ description: i.description, qty: String(i.qty), unit: i.unit, packing: i.packing })),
            }}
          />
        ) : (
          <div className="inv-wrap"><ChallanDoc d={doc} copy="Customer copy" /></div>
        )}
      </main>
    </>
  );
}
