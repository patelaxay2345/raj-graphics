import Link from "next/link";
import { ActionForm } from "@/components/admin/action-form";
import { HiddenFields } from "@/components/admin/controls";
import { IconChat, IconPlus, IconSearch } from "@/components/admin/icons";
import { TopBar } from "@/components/admin/top-bar";
import { getDb } from "@/db";
import { STATUSES, getEnquiry, listEnquiries, type EnquiryStatus } from "@/lib/enquiries";
import { showPhone } from "@/lib/order-format";
import { saveEnquiryNotesAction, setEnquiryStatusAction } from "./actions";

const BADGE: Record<EnquiryStatus, string> = { new: "b-new", quoted: "b-quoted", won: "b-won", lost: "b-lost" };
const label = (s: EnquiryStatus) => STATUSES.find(([k]) => k === s)![1];
const when = (d: Date) => d.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });

export default async function EnquiriesPage({ searchParams }: { searchParams: Promise<{ t?: string; q?: string; id?: string }> }) {
  const sp = await searchParams;
  const tab = STATUSES.find(([k]) => k === sp.t)?.[0] ?? "all";
  const q = sp.q ?? "";
  const db = getDb();
  const { rows, counts } = await listEnquiries(db, tab, q);
  const cur = sp.id && /^\d{1,9}$/.test(sp.id) ? await getEnquiry(db, Number(sp.id)) : rows[0];
  const qs = (extra: Record<string, string | number>) => `/admin/enquiries?${new URLSearchParams({ ...(tab !== "all" && { t: tab }), ...(q && { q }), ...Object.fromEntries(Object.entries(extra).map(([k, v]) => [k, String(v)])) })}`;
  const reply = cur && `https://wa.me/${cur.phone}?text=${encodeURIComponent(`Hello ${cur.name}, thank you for your enquiry${cur.product ? ` for ${cur.product}` : ""} at Raj Graphics. `)}`;

  return (
    <>
      <TopBar crumbs={["Sales", "Enquiries"]} />
      <main className="main">
        <div className="head"><div><h1>Enquiries</h1><p>Quote requests and contact messages from the site. Reply on WhatsApp, then turn a won enquiry into an order.</p></div></div>
        <div className="bar">
          <nav className="seg-grp" aria-label="Filter enquiries">
            {([["all", "All"], ...STATUSES] as [string, string][]).map(([k, l]) => (
              <Link key={k} className={tab === k ? "seg on" : "seg"} aria-current={tab === k ? "page" : undefined} href={`/admin/enquiries?${new URLSearchParams({ ...(k !== "all" && { t: k }), ...(q && { q }) })}`}>
                {l} <span className="mono">{counts[k as EnquiryStatus | "all"] ?? 0}</span>
              </Link>
            ))}
          </nav>
          <form className="search" role="search">
            <IconSearch />
            {tab !== "all" && <input type="hidden" name="t" value={tab} />}
            <input type="search" name="q" defaultValue={q} placeholder="Name, phone, product or city" aria-label="Search enquiries" />
          </form>
        </div>

        <div className="split">
          <section className="card col-main">
            {rows.length ? (
              <div className="tbl-wrap">
                <table className="tbl tbl-pick">
                  <thead><tr><th>From</th><th>Wants</th><th>Received</th><th>Status</th></tr></thead>
                  <tbody>
                    {rows.map((e) => (
                      <tr key={e.id} className={[e.id === cur?.id && "on", e.status === "new" && "unread"].filter(Boolean).join(" ") || undefined}>
                        <td><Link href={qs({ id: e.id })}>{e.name}</Link><div className="sub mono">{showPhone(e.phone)}</div></td>
                        <td><div>{e.product || "—"}</div><div className="sub">{[e.qty, e.city].filter(Boolean).join(" · ")}</div></td>
                        <td className="sub">{when(e.createdAt)}</td>
                        <td><span className={`b ${BADGE[e.status]}`}><i />{label(e.status)}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="empty">{q ? `No enquiries match “${q}”.` : "No enquiries yet. They appear here when someone uses the quote or contact form."}</p>
            )}
            <div className="foot"><span>{rows.length} of {counts.all} enquiries</span><span>Spam is filtered by Turnstile</span></div>
          </section>

          {cur && (
            <aside className="card col-side" aria-label="Enquiry details">
              <div className="card-hd"><h2>{cur.name}</h2><span className={`b ${BADGE[cur.status]}`}><i />{label(cur.status)}</span></div>
              <div className="pad">
                <dl className="dl">
                  <dt>Phone</dt><dd className="mono">{showPhone(cur.phone)}</dd>
                  <dt>Product</dt><dd>{cur.product || "—"}</dd>
                  <dt>Quantity</dt><dd>{cur.qty || "—"}</dd>
                  <dt>City</dt><dd>{cur.city || "—"}</dd>
                  <dt>Received</dt><dd>{when(cur.createdAt)} · {cur.source === "quote" ? "Quote form" : "Contact form"}</dd>
                </dl>
                {cur.message && <p className="quote">{cur.message}</p>}
                <div>
                  <span className="lbl">Status</span>
                  <div className="seg-grp" role="group" aria-label="Set status">
                    {STATUSES.map(([k, l]) => (
                      <ActionForm key={k} action={setEnquiryStatusAction}>
                        <HiddenFields id={cur.id} status={k} />
                        <button className={cur.status === k ? "seg on" : "seg"} aria-pressed={cur.status === k}>{l}</button>
                      </ActionForm>
                    ))}
                  </div>
                </div>
                <ActionForm key={cur.id} action={saveEnquiryNotesAction} className="notes-form" savedLabel="Notes saved">
                  <HiddenFields id={cur.id} />
                  <label className="fld full"><span className="lbl">Notes (only you see these)</span><textarea className="in" name="notes" maxLength={2000} rows={3} placeholder="Rate quoted, paper choice, follow-up date…" defaultValue={cur.notes} /></label>
                  <div className="form-foot"><button className="btn btn-o btn-sm">Save notes</button></div>
                </ActionForm>
                <div className="form-foot">
                  <a className="btn btn-p" href={reply} target="_blank" rel="noopener"><IconChat />Reply on WhatsApp</a>
                  <Link className="btn btn-o" href={`/admin/orders/new?enquiry=${cur.id}`}><IconPlus />Create order</Link>
                </div>
                <span className="hint">Create order fills the job card with this customer, product and quantity.</span>
              </div>
            </aside>
          )}
        </div>
      </main>
    </>
  );
}
