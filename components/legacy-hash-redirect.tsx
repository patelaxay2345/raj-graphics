"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function LegacyHashRedirect() {
  const router = useRouter();
  useEffect(() => {
    const m = location.hash.match(/^#\/((?:c|p)\/[\w-]+(?:\/\d+)?)$/);
    if (m) router.replace(`/${m[1]}`);
  }, [router]);
  return null;
}
