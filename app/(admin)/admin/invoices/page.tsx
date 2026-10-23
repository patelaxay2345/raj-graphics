import Link from "next/link";
import { TopBar } from "@/components/admin/top-bar";
import { getDb } from "@/db";
import { invoiceLabel, listInvoices, type InvoiceTab } from "@/lib/admin-invoices";
import { inr, orderNo } from "@/lib/order-format";

const TABS: [InvoiceTab, string][] = [["issued", "Unpaid"], ["paid", "Paid"], ["draft", "Drafts"], ["all", "All"]];
const STATUS = { draft: ["b-lost", "Draft"], issued: ["b-quoted", "Unpaid"], paid: ["b-won", "Paid"] } as const;
const day = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

export default async function InvoicesPage({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const sp = await searchParams;
  const tab = TABS.find(([k]) => k === sp.t)?.[0] ?? "all";
  const rows = await listInvoices(getDb(), tab);

  return (
    <>
      <TopBar crumbs={["Sales", "Invoices"]} />
      <main className="main">
        <div className="head">
          <div><h1>Invoices</h1><p>GST tax invoices. Create one from an order; numbers are given when issued.</p></div>
          <Link className="btn btn-o" href="/admin/orders">Go to orders</Link>
        </div>
        <div className="bar">
          <nav className="seg-grp" aria-label="Filter invoices">
            {TABS.map(([k, label]) => <Link key={k} className={tab === k ? "seg on" : "seg"} aria-current={tab === k ? "page" : undefined} href={`/admin/invoices?t=${k}`}>{label}</Link>)}
          </nav>
        </div>
        <section className="card">
          {rows.length ? (
            <div className="tbl-wrap">
              <table className="tbl">
                <thead><tr><th>Invoice</th><th>Date</th><th>Bill to</th><th>Order</th><th>Status</th><th className="r">Total</th><th className="r">Balance</th></tr></thead>
                <tbody>
                  {rows.map((i) => {
                    const [cls, label] = STATUS[i.status];
                    return (
                      <tr key={i.id}>
                        <td><Link className="mono" href={`/admin/invoices/${i.id}`}>{invoiceLabel(i) ?? "Draft"}</Link></td>
                        <td>{i.issuedOn ? day(i.issuedOn) : "—"}</td>
                        <td><div>{i.billName}</div><div className="sub mono">{i.billGstin || "B2C"}</div></td>
                        <td><Link className="mono" href={`/admin/orders/${i.order.id}`}>{orderNo(i.order.no)}</Link></td>
                        <td><span className={`b ${cls}`}><i />{label}</span></td>
                        <td className="r mono">{inr(i.total)}</td>
                        <td className="r mono">{i.status === "paid" ? "—" : inr(Math.max(0, i.total - i.advance))}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="empty">No invoices here yet. Open an order and choose “Create invoice”.</p>
          )}
          <div className="foot"><span>{rows.length} invoices</span><span>Issued invoices are locked</span></div>
        </section>
      </main>
    </>
  );
}
