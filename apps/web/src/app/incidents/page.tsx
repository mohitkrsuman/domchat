"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AppChrome } from "@/components/app-chrome";
import { IncidentsListSkeleton, PageHeaderSkeleton } from "@/components/skeletons";
import { useToast } from "@/components/toast";
import { Spinner } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

type Incident = {
  id: string;
  title: string;
  severity: string;
  status: string;
  repoUrl: string;
  updatedAt: string;
  owner: { email: string; name: string | null };
};

type WorkspacePayload = {
  workspace: { id: string; name: string } | null;
  membership: { role: string } | null;
};

export default function IncidentsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [workspaceName, setWorkspaceName] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const wsRes = await fetch("/api/v1/workspaces");
        if (wsRes.ok) {
          const ws: WorkspacePayload = await wsRes.json();
          if (!ws.workspace) {
            router.replace("/workspace");
            return;
          }
          setWorkspaceName(ws.workspace.name);
          setRole(ws.membership?.role ?? null);
        }

        const res = await fetch("/api/v1/incidents");
        const data = await res.json();
        if (!res.ok) {
          const msg = data.error ?? "Failed to load incidents";
          setError(msg);
          toast(msg, "error");
          setLoading(false);
          return;
        }
        setIncidents(data.incidents ?? []);
      } catch {
        const msg = "Failed to load incidents";
        setError(msg);
        toast(msg, "error");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [router, toast]);

  async function signOut() {
    setSigningOut(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      toast("Signed out");
      router.push("/login");
      router.refresh();
    } catch {
      toast("Failed to sign out", "error");
      setSigningOut(false);
    }
  }

  return (
    <main className="page max-w-4xl">
      <AppChrome>
        <Link href="/incidents/new" className="btn-primary">
          New incident
        </Link>
        <button
          onClick={signOut}
          disabled={signingOut}
          className="btn-secondary"
        >
          {signingOut ? (
            <span className="inline-flex items-center gap-2">
              <Spinner /> Signing out…
            </span>
          ) : (
            "Sign out"
          )}
        </button>
      </AppChrome>

      <header>
        {loading ? (
          <PageHeaderSkeleton />
        ) : (
          <div>
            <p className="eyebrow">Incidents</p>
            <h1 className="title">{workspaceName ?? "Workspace"}</h1>
            {role && <p className="subtitle">Role: {role}</p>}
          </div>
        )}
      </header>

      <section className="mt-10">
        {loading && <IncidentsListSkeleton />}
        {error && !loading && <p className="error-text">{error}</p>}
        {!loading && !error && incidents.length === 0 && (
          <div className="card-dashed">
            <p>No incidents yet.</p>
            <Link href="/incidents/new" className="link mt-3 inline-block text-sm">
              Create your first incident
            </Link>
          </div>
        )}
        {!loading && incidents.length > 0 && (
          <ul className="list">
            {incidents.map((incident) => (
              <li
                key={incident.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-4"
              >
                <div>
                  <p className="font-medium">{incident.title}</p>
                  <p className="mt-1 text-xs muted">
                    {incident.severity} · {incident.status} · {incident.repoUrl}
                  </p>
                </div>
                <p className="text-xs muted">
                  {new Date(incident.updatedAt).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
