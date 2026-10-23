import { requireOwner } from "@/lib/owner";

export default async function AdminHome() {
  const email = await requireOwner();
  return (
    <main className="wrap">
      <div className="sec"><div><h2>Admin</h2><p>Signed in as {email}</p></div></div>
    </main>
  );
}
