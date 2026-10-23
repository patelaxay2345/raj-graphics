import Link from "next/link";
import { ActionForm } from "@/components/admin/action-form";
import { HiddenFields } from "@/components/admin/controls";
import { IconCheck, IconPlus, IconSearch, IconUndo } from "@/components/admin/icons";
import { TopBar } from "@/components/admin/top-bar";
import { getDb } from "@/db";
import { LIST_LIMIT, istToday, listOrders, orderStats, type OrderTab } from "@/lib/admin-orders";
import { inr, jobSummary, orderNo, payState } from "@/lib/order-format";
import { setOrderStatusAction } from "./actions";

const TABS: [OrderTab, string][] = [["pending", "Pending"], ["unpaid", "Balance due"], ["done", "Done"], ["all", "All"]];
const PAY = { paid: ["b-won", "Paid"], advance: ["b-quoted", "Advance"], unpaid: ["b-due", "Unpaid"] } as const;

const date = (d: Date | string, today: string) => {
  const iso = typeof d === "string" ? d : new Date(d.getTime() + 330 * 60_000).toISOString().slice(0, 10);
  return iso === today ? "Today" : new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });
};

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ t?: string; q?: string }> }) {
  const sp = await searchParams;
  const tab = TABS.find(([k]) => k === sp.t)?.[0] ?? "pending";
  const q = sp.q ?? "";
  const db = getDb();
  const [stats, rows] = await Promise.all([orderStats(db), listOrders(db, tab, q)]);
  const today = istToday();

  return (
    <>
      <TopBar crumbs={["Sales", "Orders"]} />
      <main className="main">
        <div className="head">
          <div><h1>Orders</h1><p>Every print job from order to delivery.</p></div>
          <Link className="btn btn-p" href="/admin/orders/new"><IconPlus />New order</Link>
        </div>

        <section className="card stats" aria-label="Order totals">
          <div><span>Pending orders</span><b>{stats.pending}</b></div>
          <div><span>Due today</span><b>{stats.dueToday}</b></div>
          <div><span>Done this month</span><b>{stats.doneThisMonth}</b></div>
          <div><span>Balance to collect</span><b>{inr(stats.balance)}</b></div>
        </section>

        <div className="bar">
          <nav className="seg-grp" aria-label="Filter orders">
            {TABS.map(([k, label]) => (
              <Link key={k} className={tab === k ? "seg on" : "seg"} aria-current={tab === k ? "page" : undefined} href={`/admin/orders?t=${k}${q ? `&q=${encodeURIComponent(q)}` : ""}`}>
                {label} <span className="mono">{stats[k]}</span>
              </Link>
            ))}
          </nav>
          <form className="search" role="search">
            <IconSearch />
            <input type="hidden" name="t" value={tab} />
            <input type="search" name="q" defaultValue={q} placeholder="Order no, customer, phone or job" aria-label="Search orders" />
          </form>
        </div>

        <section className="card">
          {rows.length ? (
            <div className="tbl-wrap">
              <table className="tbl">
                <thead><tr><th>Order</th><th>Customer</th><th>Job</th><th className="r">Qty</th><th>Due</th><th>Status</th><th>Payment</th><th className="r">Amount</th></tr></thead>
                <tbody>
                  {rows.map((o) => {
                    const [first] = o.items;
                    const job = first && jobSummary(first);
                    const done = o.status === "done";
                    const [payCls, payLabel] = PAY[payState(o.total, o.advance)];
                    const late = !done && o.dueOn !== null && o.dueOn < today;
                    return (
                      <tr key={o.id}>
                        <td><Link className="mono" href={`/admin/orders/${o.id}`}>{orderNo(o.no)}</Link><div className="sub">{date(o.createdAt, today)}</div></td>
                        <td><div>{o.customer.name}</div><div className="sub">{o.customer.city || o.customer.business}</div></td>
                        <td className="job"><div>{job?.title}{o.items.length > 1 && <span className="sub"> +{o.items.length - 1} more</span>}</div><div className="sub">{job?.spec}</div></td>
                        <td className="r mono">{first ? `${first.qty.toLocaleString("en-IN")} ${first.unit}` : ""}</td>
                        <td className={late ? "late" : undefined}>{o.dueOn ? date(o.dueOn, today) : "—"}</td>
                        <td>
                          <div className="acts">
                            <span className={done ? "b b-won" : "b b-quoted"}><i />{done ? "Done" : "Pending"}</span>
                            <ActionForm action={setOrderStatusAction}>
                              <HiddenFields id={o.id} on={String(!done)} />
                              <button className="icon-btn" title={done ? "Reopen" : "Mark done"} aria-label={`${done ? "Reopen" : "Mark done"} ${orderNo(o.no)}`}>{done ? <IconUndo /> : <IconCheck />}</button>
                            </ActionForm>
                          </div>
                        </td>
                        <td><span className={`b ${payCls}`}>{payLabel}{payState(o.total, o.advance) === "advance" && ` ${inr(o.advance)}`}</span></td>
                        <td className="r mono">{inr(o.total)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="empty">{q ? `No orders match “${q}”.` : stats.all ? "No orders in this view." : "No orders yet. Create the first one."}</p>
          )}
          <div className="foot"><span>{rows.length >= LIST_LIMIT ? `Latest ${LIST_LIMIT} shown · search to narrow` : `${rows.length} of ${stats.all} orders`}</span><span>Tick marks an order done</span></div>
        </section>
      </main>
    </>
  );
}
