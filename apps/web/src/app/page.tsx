"use client";

import { useState } from "react";

type HealthStatus = {
  status: string;
  phase: string;
  postgres: string;
  redis: string;
};

export default function HomePage() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [prompt, setPrompt] = useState("Say hello from DomChat Phase 0 spike.");
  const [streamOutput, setStreamOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function checkHealth() {
    setError(null);
    const res = await fetch("/api/health");
    const data = await res.json();
    setHealth(data);
  }

  async function runStream() {
    setLoading(true);
    setError(null);
    setStreamOutput("");

    try {
      const res = await fetch("/api/spike/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Stream failed");
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        setStreamOutput((prev) => prev + decoder.decode(value));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 px-6 py-16">
      <header>
        <p className="text-sm font-medium text-emerald-400">Phase 0 — Setup spike</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">DomChat</h1>
        <p className="mt-2 text-zinc-400">
          Multiplayer AI agent workspace. This page verifies local setup and LLM streaming.
        </p>
      </header>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <h2 className="text-lg font-medium">Infrastructure health</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Requires Postgres and Redis via <code className="text-zinc-300">docker compose up -d</code>
        </p>
        <button
          onClick={checkHealth}
          className="mt-4 rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-white"
        >
          Check health
        </button>
        {health && (
          <pre className="mt-4 overflow-x-auto rounded-lg bg-zinc-950 p-4 text-sm text-zinc-300">
            {JSON.stringify(health, null, 2)}
          </pre>
        )}
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <h2 className="text-lg font-medium">LLM streaming spike</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Set <code className="text-zinc-300">OPENROUTER_API_KEY</code> or{" "}
          <code className="text-zinc-300">OPENAI_API_KEY</code> in <code className="text-zinc-300">.env</code>
        </p>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={3}
          className="mt-4 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-emerald-500"
        />
        <button
          onClick={runStream}
          disabled={loading}
          className="mt-3 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-emerald-400 disabled:opacity-50"
        >
          {loading ? "Streaming…" : "Stream response"}
        </button>
        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
        {streamOutput && (
          <pre className="mt-4 whitespace-pre-wrap rounded-lg bg-zinc-950 p-4 text-sm text-zinc-300">
            {streamOutput}
          </pre>
        )}
      </section>
    </main>
  );
}
