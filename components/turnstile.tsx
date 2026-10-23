"use client";

import { useEffect, useRef, useState } from "react";

type TurnstileApi = {
  render: (el: HTMLElement, opts: { sitekey: string; size?: string; appearance?: string; "error-callback"?: () => void }) => string;
  remove: (id: string) => void;
};

let loading: Promise<TurnstileApi> | null = null;

const load = () =>
  (loading ??= new Promise<TurnstileApi>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    s.async = true;
    s.onload = () => resolve((window as unknown as { turnstile: TurnstileApi }).turnstile);
    s.onerror = () => {
      loading = null;
      s.remove();
      reject(new Error("Turnstile failed to load"));
    };
    document.head.appendChild(s);
  }));

export function Turnstile({ siteKey }: { siteKey: string }) {
  const el = useRef<HTMLDivElement>(null);
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let id: string | undefined;
    let gone = false;
    load()
      .then((t) => {
        if (!gone && el.current) id = t.render(el.current, { sitekey: siteKey, size: "flexible", appearance: "interaction-only", "error-callback": () => setFailed(true) });
      })
      .catch(() => !gone && setFailed(true));
    return () => {
      gone = true;
      if (id) loading?.then((t) => t.remove(id!));
    };
  }, [siteKey, attempt]);

  return (
    <>
      <div key={attempt} ref={el} className="ts full" />
      {failed && (
        <div className="err show" role="alert">
          The spam check didn&apos;t load, so we can&apos;t send this yet.{" "}
          <button type="button" className="link" onClick={() => (setFailed(false), setAttempt((a) => a + 1))}>Try again</button> or use the WhatsApp button.
        </div>
      )}
    </>
  );
}
