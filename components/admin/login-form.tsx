"use client";

import { startTransition, useActionState } from "react";
import { loginAction } from "@/app/(login)/admin/login/actions";

export function LoginForm({ next }: { next: string }) {
  const [state, dispatch, pending] = useActionState(loginAction, {});
  return (
    <form
      className="pad"
      method="post"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => dispatch(fd));
      }}
    >
      <input type="hidden" name="next" value={next} />
      <label className="fld full"><span className="lbl">Email</span><input className="in" name="email" type="email" autoComplete="username" required autoFocus /></label>
      <label className="fld full"><span className="lbl">Password</span><input className="in" name="password" type="password" autoComplete="current-password" required maxLength={200} /></label>
      {state.error && <p className="msg err" role="alert">{state.error}</p>}
      <button className="btn btn-p" disabled={pending}>{pending ? "Signing in…" : "Sign in"}</button>
    </form>
  );
}
