"use client";

import { useState, type ReactNode } from "react";

export function ShowAll({ total, page, children }: { total: number; page: number; children: ReactNode }) {
  const [open, setOpen] = useState(total <= page);
  return (
    <>
      <div className={open ? "tpls" : "tpls clip"}>{children}</div>
      {!open && <div className="more"><button className="btn btn-o" onClick={() => setOpen(true)}>Show all {total} designs ↓</button></div>}
    </>
  );
}
