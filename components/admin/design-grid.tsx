"use client";

import { useOptimistic, useState, useTransition, type DragEvent } from "react";
import { deleteDesignsAction, moveDesignsAction, reorderDesignsAction, setDesignsActiveAction } from "@/app/(admin)/admin/designs/actions";
import type { ActionState } from "@/lib/admin-action";
import { img } from "@/lib/site";

type Design = { id: number; code: string; imageKey: string; active: boolean };
type Props = { groupId: number; groups: { id: number; title: string }[]; designs: Design[] };

export function DesignGrid({ groupId, groups, designs }: Props) {
  const [order, setOrder] = useOptimistic(designs);
  const [sel, setSel] = useState<number[]>([]);
  const [q, setQ] = useState("");
  const [error, setError] = useState("");
  const [dragId, setDragId] = useState<number | null>(null);
  const [pending, start] = useTransition();

  const needle = q.trim().toLowerCase();
  const shown = needle ? order.filter((d) => d.code.toLowerCase().includes(needle)) : order;
  const picked = order.filter((d) => sel.includes(d.id));
  const ids = picked.map((d) => d.id);
  const allSel = shown.length > 0 && shown.every((d) => sel.includes(d.id));
  const allHidden = picked.length > 0 && picked.every((d) => !d.active);
  const others = groups.filter((g) => g.id !== groupId);

  const act = (fn: () => Promise<ActionState>, after?: () => void) =>
    start(async () => {
      setError("");
      const r = await fn();
      if (r.error) setError(r.error);
      else after?.();
    });

  const reorder = (next: Design[]) =>
    act(async () => {
      setOrder(next);
      return reorderDesignsAction(groupId, next.map((d) => d.id));
    });

  const shift = (dir: -1 | 1) => {
    const at = order.findIndex((d) => d.id === sel[0]);
    const to = at + dir;
    if (at < 0 || to < 0 || to >= order.length) return;
    const next = [...order];
    [next[at], next[to]] = [next[to], next[at]];
    reorder(next);
  };

  const onDrop = (e: DragEvent, target: number) => {
    e.preventDefault();
    if (dragId === null || dragId === target) return;
    const moving = order.find((d) => d.id === dragId)!;
    const rest = order.filter((d) => d.id !== dragId);
    rest.splice(rest.findIndex((d) => d.id === target) + (order.findIndex((d) => d.id === dragId) < order.findIndex((d) => d.id === target) ? 1 : 0), 0, moving);
    setDragId(null);
    reorder(rest);
  };

  const toggle = (id: number) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const canDrag = !needle && !pending;

  return (
    <section className="card" aria-busy={pending}>
      <div className="card-hd">
        <div className="sel-bar">
          <button type="button" className="btn btn-o btn-sm" disabled={!shown.length} onClick={() => setSel(allSel ? [] : shown.map((d) => d.id))}>{allSel ? "Clear selection" : "Select all"}</button>
          <span>{picked.length ? `${picked.length} selected` : "Click designs to select"}</span>
          {picked.length > 0 && (
            <>
              {picked.length === 1 && (
                <>
                  <button type="button" className="btn btn-o btn-sm" disabled={pending || order[0].id === picked[0].id} onClick={() => shift(-1)}>Earlier</button>
                  <button type="button" className="btn btn-o btn-sm" disabled={pending || order.at(-1)!.id === picked[0].id} onClick={() => shift(1)}>Later</button>
                </>
              )}
              {others.length > 0 && (
                <select
                  className="in in-sm"
                  aria-label="Move to group"
                  value=""
                  disabled={pending}
                  onChange={(e) => {
                    const to = Number(e.target.value);
                    if (to) act(() => moveDesignsAction(groupId, ids, to), () => setSel([]));
                  }}
                >
                  <option value="">Move to group…</option>
                  {others.map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}
                </select>
              )}
              <button type="button" className="btn btn-o btn-sm" disabled={pending} onClick={() => act(() => setDesignsActiveAction(groupId, ids, allHidden), () => setSel([]))}>
                {allHidden ? "Show on site" : "Hide from site"}
              </button>
              <button
                type="button"
                className="btn btn-o btn-sm btn-danger"
                disabled={pending}
                onClick={() => window.confirm(`Delete ${picked.length} design${picked.length === 1 ? "" : "s"}? This cannot be undone.`) && act(() => deleteDesignsAction(groupId, ids), () => setSel([]))}
              >
                Delete
              </button>
            </>
          )}
        </div>
        <label className="search">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          <input type="search" placeholder="Design code" aria-label="Search designs" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        {error && <p className="msg err" role="alert">{error}</p>}
      </div>

      {shown.length ? (
        <div className="grid">
          {shown.map((d) => {
            const on = sel.includes(d.id);
            return (
              <button
                key={d.id}
                type="button"
                className={["tile", on && "sel", !d.active && "hid", d.id === dragId && "drag"].filter(Boolean).join(" ")}
                aria-pressed={on}
                draggable={canDrag}
                onClick={() => toggle(d.id)}
                onDragStart={() => setDragId(d.id)}
                onDragEnd={() => setDragId(null)}
                onDragOver={(e) => dragId !== null && e.preventDefault()}
                onDrop={(e) => onDrop(e, d.id)}
              >
                <span className="ck" aria-hidden="true"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg></span>
                <img src={img(d.imageKey)} alt={`Design ${d.code}`} loading="lazy" draggable={false} />
                <small><span className="mono">{d.code}</span>{!d.active && <span>Hidden</span>}</small>
              </button>
            );
          })}
        </div>
      ) : (
        <p className="empty">{order.length ? `No design code matches “${q.trim()}”.` : "No designs in this group yet. Upload some above."}</p>
      )}
      <div className="foot">
        <span>{needle ? `Showing ${shown.length} of ${order.length}` : `${order.length} design${order.length === 1 ? "" : "s"}`}</span>
        <span>{needle ? "Clear the search to reorder" : "Drag to reorder · order matches the site"}</span>
      </div>
    </section>
  );
}
