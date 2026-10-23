import Link from "next/link";
import { TopBar } from "@/components/admin/top-bar";
import { getDb } from "@/db";
import { challanLabel, listChallans, type ChallanTab } from "@/lib/admin-challans";
import { orderNo } from "@/lib/order-format";

const TABS: [ChallanTab, string][] = [["issued", "Not delivered"], ["delivered", "Delivered"], ["draft", "Drafts"], ["all", "All"]];
const STATUS = { draft: ["b-lost", "Draft"], issued: ["b-quoted", "Not delivered"], delivered: ["b-won", "Delivered"] } as const;
const day = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

export default async function ChallansPage({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const sp = await searchParams;
  const tab = TABS.find(([k]) => k === sp.t)?.[0] ?? "all";
  const rows = await listChallans(getDb(), tab);

  return (
    <>
      <TopBar crumbs={["Sales", "Challans"]} />
      <main className="main">
        <div className="head">
          <div><h1>Delivery challans</h1><p>Goods sent with each delivery. Create one from an order; numbers are given when issued.</p></div>
          <Link className="btn btn-o" href="/admin/orders">Go to orders</Link>
        </div>
        <div className="bar">
          <nav className="seg-grp" aria-label="Filter challans">
            {TABS.map(([k, label]) => <Link key={k} className={tab === k ? "seg on" : "seg"} aria-current={tab === k ? "page" : undefined} href={`/admin/challans?t=${k}`}>{label}</Link>)}
          </nav>
        </div>
        <section className="card">
          {rows.length ? (
            <div className="tbl-wrap">
              <table className="tbl">
                <thead><tr><th>Challan</th><th>Date</th><th>Deliver to</th><th>Order</th><th>Goods</th><th>Status</th></tr></thead>
                <tbody>
                  {rows.map((c) => {
                    const [cls, label] = STATUS[c.status];
                    const [first] = c.items;
                    return (
                      <tr key={c.id}>
                        <td><Link className="mono" href={`/admin/challans/${c.id}`}>{challanLabel(c) ?? "Draft"}</Link></td>
                        <td>{c.issuedOn ? day(c.issuedOn) : "—"}</td>
                        <td>{c.deliverTo}</td>
                        <td><Link className="mono" href={`/admin/orders/${c.order.id}`}>{orderNo(c.order.no)}</Link></td>
                        <td className="job"><div className="sub">{first && `${first.qty.toLocaleString("en-IN")} ${first.unit} · ${first.description}`}{c.items.length > 1 && ` +${c.items.length - 1} more`}</div></td>
                        <td><span className={`b ${cls}`}><i />{label}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="empty">No challans here yet. Open an order and choose “Create challan”.</p>
          )}
          <div className="foot"><span>{rows.length} challans</span><span>Issued challans are locked</span></div>
        </section>
      </main>
    </>
  );
}
