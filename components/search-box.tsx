"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export function SearchBox() {
  const router = useRouter();
  const pathname = usePathname();
  const [q, setQ] = useState(useSearchParams().get("q") ?? "");

  const onChange = (v: string) => {
    setQ(v);
    const url = v.trim() ? `/?q=${encodeURIComponent(v)}` : "/";
    if (pathname === "/") router.replace(url, { scroll: false });
    else router.push(url);
  };

  return (
    <label className="search">🔍<input value={q} onChange={(e) => onChange(e.target.value)} placeholder="Search visiting cards, envelopes, stickers…" /></label>
  );
}

export function SearchBoxFallback() {
  return <label className="search">🔍<input placeholder="Search visiting cards, envelopes, stickers…" /></label>;
}
