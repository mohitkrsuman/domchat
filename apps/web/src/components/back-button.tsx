"use client";

import { useRouter } from "next/navigation";

export function BackButton({
  fallbackHref = "/sessions",
  label = "Back",
}: {
  fallbackHref?: string;
  label?: string;
}) {
  const router = useRouter();

  function onBack() {
    if (typeof window !== "undefined") {
      const ref = document.referrer;
      if (ref) {
        try {
          if (new URL(ref).origin === window.location.origin) {
            router.back();
            return;
          }
        } catch {
          // fall through
        }
      }
    }
    router.push(fallbackHref);
  }

  return (
    <button type="button" onClick={onBack} className="back-button" aria-label={label}>
      <BackIcon />
      <span>{label}</span>
    </button>
  );
}

function BackIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M10 3.5 5.5 8 10 12.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
