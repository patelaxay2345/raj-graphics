import { getCloudflareContext } from "@opennextjs/cloudflare";
import Link from "next/link";
import { IconPlus } from "@/components/admin/icons";
import { TopBar } from "@/components/admin/top-bar";
import { getDb } from "@/db";
import { dashboard } from "@/lib/dashboard";
import { inr, jobSummary, orderNo } from "@/lib/order-format";

const when = (d: Date) => d.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });

export default async function AdminHome() {
  const { env } = getCloudflareContext();
  const d = await dashboard(getDb(), { turnstile: !!(env.TURNSTILE_SITE_KEY && env.TURNSTILE_SECRET_KEY) });
  const todo = d.setup.filter((s) => !s.done);

  return (
    <>
      <TopBar crumbs={["Dashboard"]} />
      <main className="main">
        <div className="head">
          <div><h1>Dashboard</h1><p>Today at the press: enquiries to answer, jobs to finish and money to collect.</p></div>
          <div className="acts gap">
            <Link className="btn btn-o" href="/admin/designs">Upload designs</Link>
            <Link className="btn btn-p" href="/admin/orders/new"><IconPlus />New order</Link>
          </div>
        </div>

        <section className="card stats" aria-label="Today">
          <Link href="/admin/enquiries?t=new"><span>New enquiries</span><b>{d.newEnquiries}</b></Link>
          <Link href="/admin/orders?t=pending"><span>Pending orders</span><b>{d.stats.pending}</b></Link>
          <Link href="/admin/orders?t=pending"><span>Due today</span><b>{d.stats.dueToday}</b></Link>
          <Link href="/admin/orders?t=unpaid"><span>Balance to collect</span><b>{inr(d.stats.balance)}</b></Link>
          <Link href="/admin/invoices?t=issued"><span>Unpaid invoices</span><b>{d.unpaidInvoices.n}</b></Link>
          <Link href="/admin/challans?t=issued"><span>Not delivered</span><b>{d.undelivered}</b></Link>
        </section>

        {todo.length > 0 && (
          <section className="card" aria-label="Before launch">
            <div className="card-hd"><h2>Before launch</h2><span>{d.setup.length - todo.length} of {d.setup.length} done</span></div>
            <ul className="todo">
              {todo.map((s) => <li key={s.label}>{s.href ? <Link href={s.href}>{s.label} →</Link> : <span>{s.label} · see the deploy notes</span>}</li>)}
            </ul>
          </section>
        )}

        <div className="row two">
          <section className="card">
            <div className="card-hd"><h2>Latest enquiries</h2><Link className="sub" href="/admin/enquiries">All enquiries →</Link></div>
            {d.recentEnquiries.length ? (
              <ul className="feed">
                {d.recentEnquiries.map((e) => (
                  <li key={e.id}>
                    <Link href={`/admin/enquiries?id=${e.id}`}><b>{e.name}</b> · {e.product || "General enquiry"}</Link>
                    <span className="sub">{when(e.createdAt)}{e.status === "new" && <span className="b b-new"><i />New</span>}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="empty">No enquiries yet.</p>}
          </section>
          <section className="card">
            <div className="card-hd"><h2>Latest orders</h2><Link className="sub" href="/admin/orders?t=all">All orders →</Link></div>
            {d.recentOrders.length ? (
              <ul className="feed">
                {d.recentOrders.map((o) => (
                  <li key={o.id}>
                    <Link href={`/admin/orders/${o.id}`}><span className="mono">{orderNo(o.no)}</span> · {o.customer.name} · {o.items[0] ? jobSummary(o.items[0]).title : ""}</Link>
                    <span className="sub">{inr(o.total)}<span className={o.status === "done" ? "b b-won" : "b b-quoted"}><i />{o.status === "done" ? "Done" : "Pending"}</span></span>
                  </li>
                ))}
              </ul>
            ) : <p className="empty">No orders yet.</p>}
          </section>
        </div>
      </main>
    </>
  );
}
