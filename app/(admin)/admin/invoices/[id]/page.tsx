import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/admin/action-form";
import { HiddenFields } from "@/components/admin/controls";
import { IconBack, IconChat, IconExternal, IconTrash } from "@/components/admin/icons";
import { InvoiceEditor } from "@/components/admin/invoice-editor";
import { TopBar } from "@/components/admin/top-bar";
import { InvoiceDoc } from "@/components/invoice-doc";
import { getDb } from "@/db";
import { docData, getInvoice } from "@/lib/admin-invoices";
import { inr, orderNo, toRupees } from "@/lib/order-format";
import { getSeller } from "@/lib/settings";
import { deleteDraftAction, setPaidAction } from "../actions";

const STATUS = { draft: ["b-lost", "Draft"], issued: ["b-quoted", "Issued · unpaid"], paid: ["b-won", "Paid"] } as const;

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const inv = /^\d{1,9}$/.test(id) ? await getInvoice(db, Number(id)) : undefined;
  if (!inv) notFound();
  const doc = docData(inv, await getSeller(db));
  const [cls, label] = STATUS[inv.status];
  const balance = Math.max(0, inv.total - inv.advance);
  const wa = `https://wa.me/${inv.order.customer.phone}?text=${encodeURIComponent(`Hello ${inv.billName}, invoice ${doc.no} for order ${doc.orderNo}: total ${inr(inv.total)}${inv.status === "paid" ? " – paid, thank you." : `, balance ${inr(balance)}.`}${doc.seller.upi && inv.status !== "paid" ? `\nUPI: ${doc.seller.upi}` : ""}\n— ${doc.seller.legalName}`)}`;

  return (
    <>
      <TopBar crumbs={["Sales", "Invoices", doc.no ?? "Draft"]} />
      <main className="main">
        <div className="head">
          <div>
            <Link className="back" href="/admin/invoices"><IconBack />Invoices</Link>
            <h1>Tax invoice <span className="mono">{doc.no ?? "draft"}</span> <span className={`b ${cls}`}><i />{label}</span></h1>
            <p>From order <Link className="mono" href={`/admin/orders/${inv.order.id}`}>{orderNo(inv.order.no)}</Link>.{inv.status === "draft" ? " Edit on the left, the preview updates live." : " Issued invoices are locked."}</p>
          </div>
          <div className="acts gap">
            {inv.status === "draft" ? (
              <ActionForm action={deleteDraftAction} confirm="Delete this draft invoice?">
                <HiddenFields id={inv.id} />
                <button className="btn btn-o btn-danger"><IconTrash />Delete draft</button>
              </ActionForm>
            ) : (
              <>
                <a className="btn btn-o" href={wa} target="_blank" rel="noopener"><IconChat />Send on WhatsApp</a>
                <a className="btn btn-o" href={`/admin/invoices/${inv.id}/print`} target="_blank" rel="noopener"><IconExternal />Print / PDF</a>
                <ActionForm action={setPaidAction}>
                  <HiddenFields id={inv.id} on={String(inv.status === "issued")} />
                  <button className={inv.status === "issued" ? "btn btn-p" : "btn btn-o"}>{inv.status === "issued" ? "Mark as paid" : "Mark unpaid"}</button>
                </ActionForm>
              </>
            )}
          </div>
        </div>

        {inv.status === "draft" ? (
          <InvoiceEditor
            id={inv.id}
            doc={{ no: null, issuedOn: null, orderNo: doc.orderNo, seller: doc.seller }}
            initial={{
              billName: inv.billName,
              billGstin: inv.billGstin,
              billAddress: inv.billAddress,
              placeOfSupply: inv.placeOfSupply,
              gstRate: inv.gstRate,
              advance: inv.advance ? toRupees(inv.advance) : "",
              note: inv.note,
              items: inv.items.map((i) => ({ description: i.description, hsn: i.hsn, qty: String(i.qty), unit: i.unit, rate: toRupees(i.rate) })),
            }}
          />
        ) : (
          <div className="inv-wrap"><InvoiceDoc d={doc} /></div>
        )}
      </main>
    </>
  );
}
