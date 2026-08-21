"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { useToast } from "@/components/toast";
import { SESSION_TYPE_LABELS, SESSION_TYPES } from "@/lib/session-fields";
import { ButtonLoader } from "@/components/ui";

export default function NewSessionPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [type, setType] = useState("feature");
  const [repoUrl, setRepoUrl] = useState("");
  const [severity, setSeverity] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const showSeverity = type === "on_call" || type === "bug";

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/v1/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          type,
          repoUrl: repoUrl || null,
          severity: showSeverity && severity ? severity : null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        const msg = data.error ?? "Failed to create session";
        setError(msg);
        toast(msg, "error");
        setLoading(false);
        return;
      }

      toast("Session created");
      router.push(`/sessions/${data.session.id}`);
      router.refresh();
    } catch {
      const msg = "Failed to create session";
      setError(msg);
      toast(msg, "error");
      setLoading(false);
    }
  }

  return (
    <main className="page-app">
      <div className="max-w-xl">
      <h1 className="title">New session</h1>
      <p className="subtitle">
        A shared place for your team and AI agents — on-call, features, bugs, or testing.
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <div>
          <label className="label" htmlFor="title">
            Title
          </label>
          <input
            id="title"
            required
            disabled={loading}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="billing-v2-checkout"
            className="input"
          />
        </div>
        <div>
          <label className="label" htmlFor="type">
            Type
          </label>
          <select
            id="type"
            disabled={loading}
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="input"
          >
            {SESSION_TYPES.map((t) => (
              <option key={t} value={t}>
                {SESSION_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="repoUrl">
            Repo URL <span className="muted">(optional)</span>
          </label>
          <input
            id="repoUrl"
            type="url"
            disabled={loading}
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            placeholder="https://github.com/acme/payments-api"
            className="input"
          />
        </div>
        {showSeverity && (
          <div>
            <label className="label" htmlFor="severity">
              Severity <span className="muted">(optional)</span>
            </label>
            <select
              id="severity"
              disabled={loading}
              value={severity}
              onChange={(e) => setSeverity(e.target.value)}
              className="input"
            >
              <option value="">None</option>
              <option value="sev1">sev1</option>
              <option value="sev2">sev2</option>
              <option value="sev3">sev3</option>
            </select>
          </div>
        )}
        {error && <p className="error-text">{error}</p>}
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? <ButtonLoader label="Creating…" /> : "Create session"}
        </button>
      </form>
      </div>
    </main>
  );
}
