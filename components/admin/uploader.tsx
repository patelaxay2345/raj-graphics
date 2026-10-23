"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type DragEvent } from "react";
import { sendWebp, toWebp } from "@/lib/client-upload";

const THUMB = 360;
const PARALLEL = 4;
const MAX_FILES = 200;
const MAX_SOURCE_BYTES = 25_000_000;
const TYPES = ["image/jpeg", "image/png", "image/webp"];

type Item = { id: number; file: File; state: "waiting" | "working" | "done" | "error"; pct: number; note: string };

export function Uploader({ groupId, groupTitle }: { groupId: number; groupTitle: string }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [over, setOver] = useState(false);
  const nextId = useRef(0);
  const busy = items.some((i) => i.state === "waiting" || i.state === "working");

  const patch = (id: number, p: Partial<Item>) => setItems((list) => list.map((i) => (i.id === id ? { ...i, ...p } : i)));

  const run = async (batch: Item[]) => {
    const queue = [...batch];
    const worker = async () => {
      for (let it = queue.shift(); it; it = queue.shift()) {
        const id = it.id;
        try {
          patch(id, { state: "working", note: "Resizing" });
          const blob = await toWebp(it.file, THUMB);
          patch(id, { note: "Uploading" });
          const { code } = await sendWebp<{ code: string }>(`/api/admin/designs?group=${groupId}`, blob, (pct) => patch(id, { pct }));
          patch(id, { state: "done", pct: 100, note: code });
        } catch (e) {
          patch(id, { state: "error", note: e instanceof Error ? e.message : "Failed" });
        }
      }
    };
    await Promise.all(Array.from({ length: PARALLEL }, worker));
    router.refresh();
  };

  const add = (files: FileList | null) => {
    if (!files?.length || busy) return;
    const batch = [...files].slice(0, MAX_FILES).map((file): Item => {
      const bad = !TYPES.includes(file.type) ? "Not JPG, PNG or WebP" : file.size > MAX_SOURCE_BYTES ? "Over 25 MB" : "";
      return { id: nextId.current++, file, state: bad ? "error" : "waiting", pct: 0, note: bad || "Waiting" };
    });
    setItems(batch);
    run(batch.filter((i) => i.state === "waiting"));
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    add(e.dataTransfer.files);
  };

  const done = items.filter((i) => i.state === "done").length;
  const failed = items.filter((i) => i.state === "error").length;

  return (
    <div className="up">
      <div
        className={over ? "drop over" : "drop"}
        role="button"
        tabIndex={0}
        aria-disabled={busy}
        onClick={() => !busy && input.current?.click()}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && !busy && (e.preventDefault(), input.current?.click())}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 15V3M7 8l5-5 5 5" /><path d="M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4" /></svg>
        <b>{busy ? "Uploading…" : "Drop images here or click to choose"}</b>
        <span>JPG, PNG or WebP · up to {MAX_FILES} at once · {PARALLEL} upload together</span>
        <input ref={input} type="file" multiple accept={TYPES.join(",")} onChange={(e) => { add(e.target.files); e.target.value = ""; }} />
      </div>
      <div className="queue">
        <div className="queue-hd">
          <span>{items.length ? `${items.length} files · ${done} done${failed ? ` · ${failed} failed` : ""}` : "No uploads yet"}</span>
          <span>Group: {groupTitle}</span>
        </div>
        <ul aria-live="polite">
          {items.map((i) => (
            <li key={i.id} className={i.state === "error" ? "err" : i.state === "done" ? "done" : undefined}>
              <span title={i.file.name}>{i.file.name}</span>
              <span className="mono">{i.state === "done" ? i.note : ""}</span>
              <progress max={100} value={i.pct} aria-label={`${i.file.name} upload progress`} />
              <span>{i.state === "done" ? "Done" : i.state === "working" && i.note === "Uploading" ? `${i.pct}%` : i.note}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
