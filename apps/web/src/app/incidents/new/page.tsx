"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function IncidentsNewRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/sessions/new");
  }, [router]);

  return (
    <main className="page">
      <p className="muted text-sm">Redirecting…</p>
    </main>
  );
}
