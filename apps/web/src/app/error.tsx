"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AppChrome } from "@/components/app-chrome";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="page">
      <AppChrome />
      <div className="mt-20 max-w-lg">
        <p className="eyebrow">Error</p>
        <h1 className="title">Something went wrong</h1>
        <p className="subtitle mt-3 text-base">
          This page hit an unexpected error. You can retry or return to sessions.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <button type="button" onClick={reset} className="btn-primary">
            Try again
          </button>
          <Link href="/sessions" className="btn-secondary">
            Go to sessions
          </Link>
        </div>
      </div>
    </main>
  );
}
