"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppChrome } from "@/components/app-chrome";
import { FormPageSkeleton } from "@/components/skeletons";
import { useToast } from "@/components/toast";
import { ButtonLoader } from "@/components/ui";

type WorkspaceResponse = {
  workspace: { id: string; name: string } | null;
};

export default function WorkspacePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/v1/workspaces");
        if (res.ok) {
          const data: WorkspaceResponse = await res.json();
          if (data.workspace) {
            router.replace("/sessions");
            return;
          }
        }
      } catch {
        toast("Failed to load workspace", "error");
      } finally {
        setChecking(false);
      }
    }
    void load();
  }, [router, toast]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/v1/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      const data = await res.json();

      if (!res.ok) {
        const msg = data.error ?? "Failed to create workspace";
        setError(msg);
        toast(msg, "error");
        setLoading(false);
        return;
      }

      toast("Workspace created");
      router.push("/sessions");
      router.refresh();
    } catch {
      const msg = "Failed to create workspace";
      setError(msg);
      toast(msg, "error");
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <main className="page-narrow">
        <AppChrome />
        <FormPageSkeleton />
      </main>
    );
  }

  return (
    <main className="page-narrow">
      <AppChrome />
      <p className="eyebrow">Phase 1 — Foundation</p>
      <h1 className="title">Create workspace</h1>
      <p className="subtitle">
        Your team’s shared home for agent sessions. You’ll be the workspace admin.
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <div>
          <label className="label" htmlFor="name">
            Workspace name
          </label>
          <input
            id="name"
            type="text"
            required
            disabled={loading}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Acme Engineering"
            className="input"
          />
        </div>
        {error && <p className="error-text">{error}</p>}
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? <ButtonLoader label="Creating…" /> : "Create workspace"}
        </button>
      </form>
    </main>
  );
}
