"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FormPageSkeleton } from "@/components/skeletons";
import { useToast } from "@/components/toast";
import { ButtonLoader } from "@/components/ui";

type Member = {
  userId: string;
  email: string;
  name: string | null;
  role: "admin" | "member";
};

type WorkspaceResponse = {
  workspace: { id: string; name: string } | null;
  membership: { role: "admin" | "member" } | null;
  members?: Member[];
};

export default function WorkspacePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [workspaceName, setWorkspaceName] = useState<string | null>(null);
  const [role, setRole] = useState<"admin" | "member" | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member">("member");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/v1/workspaces");
        if (res.ok) {
          const data: WorkspaceResponse = await res.json();
          if (data.workspace) {
            setWorkspaceName(data.workspace.name);
            setRole(data.membership?.role ?? null);
            setMembers(data.members ?? []);
          }
        } else {
          toast("Failed to load workspace", "error");
        }
      } catch {
        toast("Failed to load workspace", "error");
      } finally {
        setChecking(false);
      }
    }
    void load();
  }, [toast]);

  async function onCreate(e: FormEvent) {
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

  async function onInvite(e: FormEvent) {
    e.preventDefault();
    setInviting(true);
    setInviteError(null);

    try {
      const res = await fetch("/api/v1/workspaces/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = data.error ?? "Failed to add member";
        setInviteError(msg);
        toast(msg, "error");
        setInviting(false);
        return;
      }
      setMembers((prev) => [...prev, data.member]);
      setInviteEmail("");
      setInviteRole("member");
      toast("Member added");
    } catch {
      const msg = "Failed to add member";
      setInviteError(msg);
      toast(msg, "error");
    } finally {
      setInviting(false);
    }
  }

  if (checking) {
    return (
      <main className="page-app">
        <div className="mx-auto max-w-md">
          <FormPageSkeleton />
        </div>
      </main>
    );
  }

  if (!workspaceName) {
    return (
      <main className="page-app">
        <div className="mx-auto max-w-md">
        <p className="eyebrow">Workspace</p>
        <h1 className="title">Create workspace</h1>
        <p className="subtitle">
          Your team’s shared home for agent sessions. You’ll be the workspace admin.
        </p>

        <form onSubmit={onCreate} className="mt-8 space-y-4">
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
        </div>
      </main>
    );
  }

  const isAdmin = role === "admin";

  return (
    <main className="page-app">
      <div className="max-w-xl">
      <p className="eyebrow">Workspace</p>
      <h1 className="title">{workspaceName}</h1>
      <p className="subtitle">Your role: {role}</p>

      <section className="mt-10">
        <h2 className="text-sm font-medium">Members</h2>
        <ul className="list mt-3">
          {members.map((m) => (
            <li key={m.userId} className="flex items-center justify-between gap-3 px-4 py-3">
              <div>
                <p className="text-sm font-medium">{m.name || m.email}</p>
                {m.name && <p className="text-xs muted">{m.email}</p>}
              </div>
              <p className="text-xs muted">{m.role}</p>
            </li>
          ))}
        </ul>
      </section>

      {isAdmin ? (
        <section className="mt-8">
          <h2 className="text-sm font-medium">Add member</h2>
          <p className="subtitle mt-1">
            They must already have a DOOMCHAT account. Ask them to sign up first, then add their
            email here — they should not create their own workspace.
          </p>
          <form onSubmit={onInvite} className="mt-4 space-y-4">
            <div>
              <label className="label" htmlFor="inviteEmail">
                Email
              </label>
              <input
                id="inviteEmail"
                type="email"
                required
                disabled={inviting}
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="teammate@acme.com"
                className="input"
              />
            </div>
            <div>
              <label className="label" htmlFor="inviteRole">
                Role
              </label>
              <select
                id="inviteRole"
                disabled={inviting}
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as "admin" | "member")}
                className="input"
              >
                <option value="member">member</option>
                <option value="admin">admin</option>
              </select>
            </div>
            {inviteError && <p className="error-text">{inviteError}</p>}
            <button type="submit" disabled={inviting} className="btn-primary">
              {inviting ? <ButtonLoader label="Adding…" /> : "Add member"}
            </button>
          </form>
        </section>
      ) : (
        <p className="subtitle mt-8">Only workspace admins can add members.</p>
      )}
      </div>
    </main>
  );
}
