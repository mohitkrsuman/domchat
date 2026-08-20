"use client";

export function AmbientBackground() {
  return (
    <div className="ambient-root" aria-hidden>
      <div className="ambient-wash" />
      <div className="ambient-blob ambient-blob-a" />
      <div className="ambient-blob ambient-blob-b" />
      <div className="ambient-blob ambient-blob-c" />
    </div>
  );
}
