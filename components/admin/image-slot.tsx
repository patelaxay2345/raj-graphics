"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { sendWebp, toWebp } from "@/lib/client-upload";

export function ImageSlot({ url, label, hint, src, maxSide }: { url: string; label: string; hint: string; src: string | null; maxSide: number }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<{ busy: boolean; error?: string; pct?: number }>({ busy: false });

  const pick = async (file?: File) => {
    if (!file) return;
    setState({ busy: true, pct: 0 });
    try {
      const blob = await toWebp(file, maxSide);
      await sendWebp(url, blob, (pct) => setState({ busy: true, pct }));
      setState({ busy: false });
      router.refresh();
    } catch (e) {
      setState({ busy: false, error: e instanceof Error ? e.message : "Upload failed" });
    }
  };

  return (
    <div className="img-slot">
      <span className="lbl">{label}</span>
      <div className="img-box">
        {src ? <img src={src} alt="" /> : <span className="thumb-ph" />}
        <div>
          <span>{state.busy ? `Uploading… ${state.pct ?? 0}%` : hint}</span>
          <span><button type="button" className="btn btn-o btn-sm" disabled={state.busy} onClick={() => input.current?.click()}>{src ? "Replace" : "Upload"}</button></span>
          {state.error && <span className="msg err" role="alert">{state.error}</span>}
        </div>
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }} />
      </div>
    </div>
  );
}
