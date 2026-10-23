"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ICON = { width: 16, height: 16, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true } as const;

const LINKS = [
  { href: "/admin", label: "Dashboard", icon: <svg {...ICON}><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></svg> },
  { group: "Catalog" },
  { href: "/admin/designs", label: "Designs", icon: <svg {...ICON}><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-5-5L5 21" /></svg> },
];

export function AdminNav() {
  const path = usePathname();
  return (
    <nav aria-label="Admin">
      {LINKS.map((l) => {
        if ("group" in l) return <div key={l.group} className="ngrp">{l.group}</div>;
        const on = l.href === "/admin" ? path === "/admin" : path.startsWith(l.href);
        return <Link key={l.href} href={l.href} className={on ? "nav on" : "nav"} aria-current={on ? "page" : undefined}>{l.icon}{l.label}</Link>;
      })}
    </nav>
  );
}
