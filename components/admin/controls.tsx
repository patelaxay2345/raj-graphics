import { ActionForm } from "@/components/admin/action-form";
import { IconDown, IconUp } from "@/components/admin/icons";
import type { ActionState } from "@/app/(admin)/admin/categories/actions";

type Action = (s: ActionState, fd: FormData) => Promise<ActionState>;
type Hidden = Record<string, string | number>;

const fields = (h: Hidden) => Object.entries(h).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />);

export function Switch({ action, hidden, on, label }: { action: Action; hidden: Hidden; on: boolean; label: string }) {
  return (
    <ActionForm action={action}>
      {fields({ ...hidden, on: String(!on) })}
      <button className={on ? "sw sw-on" : "sw sw-off"} role="switch" aria-checked={on} aria-label={label}><span /></button>
    </ActionForm>
  );
}

export function MoveButtons({ action, hidden, first, last, label }: { action: Action; hidden: Hidden; first: boolean; last: boolean; label: string }) {
  return (
    <>
      <ActionForm action={action}>{fields({ ...hidden, dir: -1 })}<button className="icon-btn" disabled={first} aria-label={`Move ${label} up`}><IconUp /></button></ActionForm>
      <ActionForm action={action}>{fields({ ...hidden, dir: 1 })}<button className="icon-btn" disabled={last} aria-label={`Move ${label} down`}><IconDown /></button></ActionForm>
    </>
  );
}

export { fields as HiddenFields };
