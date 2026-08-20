"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { AppChrome } from "@/components/app-chrome";
import { useToast } from "@/components/toast";
import { ButtonLoader } from "@/components/ui";

export default function NewIncidentPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [severity, setSeverity] = useState("sev2");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/v1/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, repoUrl, severity }),
      });

      const data = await res.json();

      if (!res.ok) {
        const msg = data.error ?? "Failed to create incident";
        setError(msg);
        toast(msg, "error");
        setLoading(false);
        return;
      }

      toast("Incident created");
      router.push("/incidents");
      router.refresh();
    } catch {
      const msg = "Failed to create incident";
      setError(msg);
      toast(msg, "error");
      setLoading(false);
    }
  }

  return (
    <main className="page max-w-xl">
      <AppChrome />
      <Link href="/incidents" className="btn-ghost px-0">
        ← Back to incidents
      </Link>
      <h1 className="title">New incident</h1>
      <p className="subtitle">
        Create a shared room record. Multiplayer agent features come in later phases.
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
            placeholder="prod-payment-500-error"
            className="input"
          />
        </div>
        <div>
          <label className="label" htmlFor="repoUrl">
            Repo URL
          </label>
          <input
            id="repoUrl"
            required
            type="url"
            disabled={loading}
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            placeholder="https://github.com/acme/payments-api"
            className="input"
          />
        </div>
        <div>
          <label className="label" htmlFor="severity">
            Severity
          </label>
          <select
            id="severity"
            disabled={loading}
            value={severity}
            onChange={(e) => setSeverity(e.target.value)}
            className="input"
          >
            <option value="sev1">sev1</option>
            <option value="sev2">sev2</option>
            <option value="sev3">sev3</option>
          </select>
        </div>
        {error && <p className="error-text">{error}</p>}
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? <ButtonLoader label="Creating…" /> : "Create incident"}
        </button>
      </form>
    </main>
  );
}
