import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { LoginForm } from "@/components/admin/login-form";
import { safeNext } from "@/lib/auth";
import { checkOwner } from "@/lib/owner";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next);
  if ("email" in (await checkOwner(await headers()))) redirect(next);
  return (
    <main className="login">
      <div className="login-card">
        <div className="login-brand"><img src="/logo.png" alt="" /><span><b>Raj Graphics</b><small>Printing press admin</small></span></div>
        <h1>Sign in</h1>
        <LoginForm next={next} />
      </div>
    </main>
  );
}
