"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { useToast } from "@/components/toast";
import { ButtonLoader } from "@/components/ui";
import { parseSessionIdInput } from "@/lib/session-link";

export default function JoinSessionPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const sessionId = parseSessionIdInput(input);
    if (!sessionId) {
      const msg = "Paste a session link or id";
      setError(msg);
      toast(msg, "error");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/v1/sessions/${sessionId}/join`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        const msg =
          data.code === "FORBIDDEN_WORKSPACE"
            ? data.error
            : (data.error ?? "Failed to join session");
        setError(msg);
        toast(msg, "error");
        setLoading(false);
        return;
      }

      toast(data.created ? "Joined session" : "Opening session");
      router.push(`/sessions/${sessionId}`);
      router.refresh();
    } catch {
      const msg = "Failed to join session";
      setError(msg);
      toast(msg, "error");
      setLoading(false);
    }
  }

  return (
    <main className="page-app">
      <div className="max-w-xl">
        <Link href="/sessions" className="btn-ghost px-0">
          ← Back to sessions
        </Link>
        <h1 className="title">Join session</h1>
        <p className="subtitle">
          Paste a share link from a teammate. An admin must invite you to that workspace first
          (Workspace → Add member).
        </p>

        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <div>
            <label className="label" htmlFor="sessionLink">
              Session link or id
            </label>
            <input
              id="sessionLink"
              required
              disabled={loading}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="https://…/sessions/… or session id"
              className="input"
              autoFocus
            />
          </div>
          {error && <p className="error-text">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? <ButtonLoader label="Joining…" /> : "Join session"}
          </button>
        </form>
      </div>
    </main>
  );
}
