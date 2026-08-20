"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PageHeaderSkeleton, SessionsListSkeleton } from "@/components/skeletons";
import { useToast } from "@/components/toast";
import { SESSION_TYPE_LABELS } from "@/lib/session-fields";

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

  return (
    <main className="page-app">
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
              Create one, or join a teammate with their share link.
            </p>
            <div className="mt-3 flex flex-wrap gap-4 text-sm">
              <Link href="/sessions/new" className="link">
                Create your first session
              </Link>
              <Link href="/sessions/join" className="link">
                Join with a link
              </Link>
            </div>
          </div>
        )}
        {!loading && sessions.length > 0 && (
          <ul className="list">
            {sessions.map((session) => (
              <li key={session.id}>
                <Link
                  href={`/sessions/${session.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 hover:bg-[color-mix(in_srgb,var(--fg)_4%,transparent)]"
                >
                  <div>
                    <p className="font-medium">{session.title}</p>
                    <p className="mt-1 text-xs muted">
                      {SESSION_TYPE_LABELS[session.type as keyof typeof SESSION_TYPE_LABELS] ??
                        session.type}
                      {session.severity ? ` · ${session.severity}` : ""}
                      {` · ${session.status}`}
                      {session.repoUrl ? ` · ${session.repoUrl}` : ""}
                    </p>
                  </div>
                  <p className="text-xs muted">
                    {new Date(session.updatedAt).toLocaleString()}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
