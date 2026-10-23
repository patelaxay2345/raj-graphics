"use client";

import { startTransition, useActionState, useEffect, useRef, type ReactNode } from "react";
import type { ActionState } from "@/lib/admin-action";

type Props = {
  action: (state: ActionState, fd: FormData) => Promise<ActionState>;
  children: ReactNode;
  className?: string;
  confirm?: string;
  savedLabel?: string;
  resetOnSave?: boolean;
};

export function ActionForm({ action, children, className, confirm, savedLabel, resetOnSave }: Props) {
  const [state, dispatch, pending] = useActionState(action, {});
  const form = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (resetOnSave && state.saved) form.current?.reset();
  }, [resetOnSave, state.saved]);

  return (
    <form
      ref={form}
      className={className}
      aria-busy={pending}
      onSubmit={(e) => {
        e.preventDefault();
        if (confirm && !window.confirm(confirm)) return;
        const fd = new FormData(e.currentTarget);
        startTransition(() => dispatch(fd));
      }}
    >
      <fieldset className="fs" disabled={pending}>{children}</fieldset>
      {state.error ? <p className="msg err" role="alert">{state.error}</p> : savedLabel && state.saved ? <p className="msg ok" role="status">{savedLabel}</p> : null}
    </form>
  );
}
