import Link from "next/link";
import { IconBack } from "@/components/admin/icons";
import { OrderForm, type OrderFormValues } from "@/components/admin/order-form";
import { TopBar } from "@/components/admin/top-bar";
import { getDb } from "@/db";
import { getEnquiry, orderPrefill } from "@/lib/enquiries";
import { showPhone } from "@/lib/order-format";

export default async function NewOrderPage({ searchParams }: { searchParams: Promise<{ enquiry?: string }> }) {
  const { enquiry } = await searchParams;
  const e = enquiry && /^\d{1,9}$/.test(enquiry) ? await getEnquiry(getDb(), Number(enquiry)) : undefined;
  const pre = e && orderPrefill(e);
  const initial: OrderFormValues | undefined = pre && {
    customer: { phone: showPhone(pre.customer.phone), name: pre.customer.name, business: "", gstin: "", city: pre.customer.city, address: "" },
    items: [{ ...pre.item, rate: "" }],
    dueOn: "",
    deliveryMode: "pickup",
    designBy: "we",
    proofBy: "whatsapp",
    notes: pre.notes,
    gstRate: 18,
    advance: "",
    payMode: "",
  };

  return (
    <>
      <TopBar crumbs={["Sales", "Orders", "New order"]} />
      <main className="main">
        <div className="head">
          <div>
            <Link className="back" href={e ? `/admin/enquiries?id=${e.id}` : "/admin/orders"}><IconBack />{e ? "Enquiry" : "Orders"}</Link>
            <h1>New order</h1>
            <p>{e ? `Filled from ${e.name}'s enquiry. Check the details and add the rate.` : "Job card for the press. Customer, job, delivery and payment in one place."}</p>
          </div>
        </div>
        <OrderForm initial={initial} />
      </main>
    </>
  );
}
