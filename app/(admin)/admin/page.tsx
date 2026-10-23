import Link from "next/link";
import { TopBar } from "@/components/admin/top-bar";

export default function AdminHome() {
  return (
    <>
      <TopBar crumbs={["Dashboard"]} />
      <main className="main">
        <div className="head"><div><h1>Dashboard</h1><p>Orders, enquiries and stats arrive with the next admin steps.</p></div></div>
        <div className="chips"><Link className="chip" href="/admin/designs">Upload designs →</Link></div>
      </main>
    </>
  );
}
