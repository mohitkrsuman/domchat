"use client";

import { useEffect } from "react";

export default function GlobalError({
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
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          fontFamily: "system-ui, sans-serif",
          background: "#0c0c0c",
          color: "#f5f5f5",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <div style={{ maxWidth: 420 }}>
          <p style={{ color: "#2dd4bf", fontSize: 14, margin: 0 }}>DOOMCHAT</p>
          <h1 style={{ fontSize: 28, margin: "8px 0 0" }}>Something went wrong</h1>
          <p style={{ color: "#a3a3a3", fontSize: 14, lineHeight: 1.5 }}>
            An unexpected error occurred. Try again, or go back home.
          </p>
          <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
            <button
              type="button"
              onClick={reset}
              style={{
                border: "none",
                borderRadius: 8,
                padding: "8px 16px",
                background: "#2dd4bf",
                color: "#042f2e",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Try again
            </button>
            <a
              href="/"
              style={{
                borderRadius: 8,
                padding: "8px 16px",
                border: "1px solid #3f3f3f",
                color: "#f5f5f5",
                textDecoration: "none",
                fontSize: 14,
              }}
            >
              Home
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
