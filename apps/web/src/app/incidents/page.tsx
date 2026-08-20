"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Old Phase 1 path — send people to sessions. */
export default function IncidentsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/sessions");
  }, [router]);

  return (
    <main className="page">
      <p className="muted text-sm">Redirecting to sessions…</p>
    </main>
  );
}
