import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/admin/action-form";
import { HiddenFields } from "@/components/admin/controls";
import { IconBack, IconChat } from "@/components/admin/icons";
import { OrderForm } from "@/components/admin/order-form";
import { TopBar } from "@/components/admin/top-bar";
import { getDb } from "@/db";
import { getOrder } from "@/lib/admin-orders";
import { orderMessage, orderNo, showPhone, toRupees } from "@/lib/order-format";
import { setOrderStatusAction } from "../actions";

const stamp = (d: Date) => d.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const o = /^\d{1,9}$/.test(id) ? await getOrder(getDb(), Number(id)) : undefined;
  if (!o) notFound();
  const done = o.status === "done";
  const no = orderNo(o.no);

  return (
    <>
      <TopBar crumbs={["Sales", "Orders", no]} />
      <main className="main">
        <div className="head">
          <div><Link className="back" href="/admin/orders"><IconBack />Orders</Link><h1>Order <span className="mono">{no}</span></h1><p>{o.customer.name} · {showPhone(o.customer.phone)}</p></div>
        </div>

        <section className="card status-bar" aria-label="Order status">
          <span className="acts">
            <span className={done ? "b b-won" : "b b-quoted"}><i />{done ? "Done" : "Pending"}</span>
            <span className="sub">{done && o.doneAt ? `Done ${stamp(o.doneAt)}` : `Placed ${stamp(o.createdAt)}`}</span>
          </span>
          <span className="acts">
            <a className="btn btn-o btn-sm" href={orderMessage(o, done ? "done" : "placed")} target="_blank" rel="noopener"><IconChat />{done ? "Send ready message" : "Send order summary"}</a>
            <ActionForm action={setOrderStatusAction}>
              <HiddenFields id={o.id} on={String(!done)} />
              <button className={done ? "btn btn-o btn-sm" : "btn btn-p btn-sm"}>{done ? "Reopen" : "Mark done"}</button>
            </ActionForm>
          </span>
        </section>

        <OrderForm
          id={o.id}
          initial={{
            customer: { phone: showPhone(o.customer.phone), name: o.customer.name, business: o.customer.business, gstin: o.customer.gstin, city: o.customer.city, address: o.customer.address },
            items: o.items.map((i) => ({ service: i.service, specs: i.specs, qty: String(i.qty), unit: i.unit, rate: toRupees(i.rate), hsn: i.hsn })),
            dueOn: o.dueOn ?? "",
            deliveryMode: o.deliveryMode,
            designBy: o.designBy,
            proofBy: o.proofBy,
            notes: o.notes,
            gstRate: o.gstRate,
            advance: o.advance ? toRupees(o.advance) : "",
            payMode: o.payMode ?? "",
          }}
        />
      </main>
    </>
  );
}
