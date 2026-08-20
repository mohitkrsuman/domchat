"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AppChrome } from "@/components/app-chrome";
import { PageHeaderSkeleton, SessionsListSkeleton } from "@/components/skeletons";
import { useToast } from "@/components/toast";
import { Spinner } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

const TYPE_LABELS: Record<string, string> = {
  on_call: "On-call",
  feature: "Feature",
  bug: "Bug",
  testing: "Testing",
  other: "Other",
};

type Session = {
  id: string;
  title: string;
  type: string;
  severity: string | null;
  status: string;
  repoUrl: string | null;
  updatedAt: string;
  owner: { email: string; name: string | null };
};

type WorkspacePayload = {
  workspace: { id: string; name: string } | null;
  membership: { role: string } | null;
};

export default function SessionsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [sessions, setSessions] = useState<Session[]>([]);
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

        const res = await fetch("/api/v1/sessions");
        const data = await res.json();
        if (!res.ok) {
          const msg = data.error ?? "Failed to load sessions";
          setError(msg);
          toast(msg, "error");
          setLoading(false);
          return;
        }
        setSessions(data.sessions ?? []);
      } catch {
        const msg = "Failed to load sessions";
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
        <Link href="/sessions/new" className="btn-primary">
          New session
        </Link>
        <button onClick={signOut} disabled={signingOut} className="btn-secondary">
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
            <p className="eyebrow">Sessions</p>
            <h1 className="title">{workspaceName ?? "Workspace"}</h1>
            {role && <p className="subtitle">Role: {role}</p>}
          </div>
        )}
      </header>

      <section className="mt-10">
        {loading && <SessionsListSkeleton />}
        {error && !loading && <p className="error-text">{error}</p>}
        {!loading && !error && sessions.length === 0 && (
          <div className="card-dashed">
            <p>No sessions yet.</p>
            <p className="subtitle mt-1">
              Open a shared session for on-call, features, bugs, or testing.
            </p>
            <Link href="/sessions/new" className="link mt-3 inline-block text-sm">
              Create your first session
            </Link>
          </div>
        )}
        {!loading && sessions.length > 0 && (
          <ul className="list">
            {sessions.map((session) => (
              <li
                key={session.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-4"
              >
                <div>
                  <p className="font-medium">{session.title}</p>
                  <p className="mt-1 text-xs muted">
                    {TYPE_LABELS[session.type] ?? session.type}
                    {session.severity ? ` · ${session.severity}` : ""}
                    {` · ${session.status}`}
                    {session.repoUrl ? ` · ${session.repoUrl}` : ""}
                  </p>
                </div>
                <p className="text-xs muted">
                  {new Date(session.updatedAt).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
