"use client";

import { useEffect, useState } from "react";

export function ChipNav({ tabs }: { tabs: [string, string][] }) {
  const [on, setOn] = useState(tabs[0][0]);

  useEffect(() => {
    const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && setOn(e.target.id)), { rootMargin: "-150px 0px -60% 0px" });
    document.querySelectorAll(".grp").forEach((g) => io.observe(g));
    return () => io.disconnect();
  }, []);

  return (
    <div className="chips">
      {tabs.map(([id, t]) => <a key={id} className={id === on ? "chip on" : "chip"} href={`#${id}`}>{t}</a>)}
    </div>
  );
}
