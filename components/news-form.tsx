"use client";

import { useState } from "react";

export function NewsForm() {
  const [sent, setSent] = useState(false);
  return (
    <form onSubmit={(e) => { e.preventDefault(); setSent(true); }}>
      <input type="email" required placeholder="Enter your email address" />
      <button className="btn btn-p" type="submit" disabled={sent}>Subscribe →</button>
      <div className={sent ? "ok show" : "ok"}>✓ Subscribed!</div>
    </form>
  );
}
