import Link from "next/link";
import { IconBack } from "@/components/admin/icons";
import { OrderForm } from "@/components/admin/order-form";
import { TopBar } from "@/components/admin/top-bar";

export default function NewOrderPage() {
  return (
    <>
      <TopBar crumbs={["Sales", "Orders", "New order"]} />
      <main className="main">
        <div className="head">
          <div><Link className="back" href="/admin/orders"><IconBack />Orders</Link><h1>New order</h1><p>Job card for the press. Customer, job, delivery and payment in one place.</p></div>
        </div>
        <OrderForm />
      </main>
    </>
  );
}
