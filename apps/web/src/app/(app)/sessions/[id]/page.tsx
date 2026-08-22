"use client";

import { useRouter } from "next/navigation";
import { FormEvent, use, useCallback, useEffect, useState } from "react";
import { SessionRoomSkeleton } from "@/components/skeletons";
import { AgentControls } from "@/components/session-room/agent-controls";
import { Composer } from "@/components/session-room/composer";
import { PresencePanel } from "@/components/session-room/presence-panel";
import { Timeline } from "@/components/session-room/timeline";
import { useToast } from "@/components/toast";
import { ButtonLoader } from "@/components/ui";
import { useSessionRealtime } from "@/hooks/use-session-realtime";
import type { AgentRunDto, SessionContextDto } from "@/lib/agent/types";
import { isActiveRunStatus } from "@/lib/agent/types";
import {
  SESSION_EVENT_TYPES,
  type AgentRunStatusValue,
  type PresenceUser,
  type TimelineEvent,
} from "@/lib/realtime-protocol";
import {
  SESSION_STATUSES,
  SESSION_TYPE_LABELS,
  SESSION_TYPES,
  type SessionStatusValue,
  type SessionTypeValue,
} from "@/lib/session-fields";
import { canRunAgent, canSendMessages, isSessionOwner } from "@/lib/session-roles";

type UserRef = { id: string; email: string; name: string | null };

type Participant = {
  userId: string;
  role: "viewer" | "contributor" | "owner";
  user: UserRef;
};

type Session = {
  id: string;
  title: string;
  type: SessionTypeValue;
  severity: string | null;
  status: SessionStatusValue;
  repoUrl: string | null;
  createdAt: string;
  updatedAt: string;
  owner: UserRef;
  createdBy: UserRef;
  participants: Participant[];
};

type Me = { userId: string; role: Participant["role"] };

export default function SessionRoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { toast } = useToast();
  const [session, setSession] = useState<Session | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [presence, setPresence] = useState<PresenceUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [copying, setCopying] = useState(false);
  const [editing, setEditing] = useState(false);
  const [changingUserId, setChangingUserId] = useState<string | null>(null);
  const [kickingUserId, setKickingUserId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<SessionTypeValue>("other");
  const [repoUrl, setRepoUrl] = useState("");
  const [severity, setSeverity] = useState("");
  const [status, setStatus] = useState<SessionStatusValue>("open");
  const [activeRun, setActiveRun] = useState<AgentRunDto | null>(null);
  const [contexts, setContexts] = useState<SessionContextDto[]>([]);
  const [live, setLive] = useState<{ runId: string; text: string } | null>(null);
  const [starting, setStarting] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [addingContext, setAddingContext] = useState(false);

  const onEvent = useCallback((event: TimelineEvent) => {
    setEvents((prev) => (prev.some((e) => e.id === event.id) ? prev : [...prev, event]));
    if (event.type === SESSION_EVENT_TYPES.roleChanged) {
      const userId = String(event.payload.userId ?? "");
      const role = event.payload.role as Participant["role"];
      if (userId && (role === "viewer" || role === "contributor" || role === "owner")) {
        setSession((prev) =>
          prev
            ? {
                ...prev,
                participants: prev.participants.map((p) =>
                  p.userId === userId ? { ...p, role } : p
                ),
              }
            : prev
        );
        setMe((prev) => (prev && prev.userId === userId ? { ...prev, role } : prev));
      }
    }
    if (event.type === SESSION_EVENT_TYPES.participantRemoved) {
      const userId = String(event.payload.userId ?? "");
      if (userId) {
        setSession((prev) =>
          prev
            ? {
                ...prev,
                participants: prev.participants.filter((p) => p.userId !== userId),
              }
            : prev
        );
      }
    }
    if (event.type === SESSION_EVENT_TYPES.messageAgent) {
      const runId = String(event.payload.runId ?? "");
      setLive((prev) => (prev && prev.runId === runId ? null : prev));
    }
    if (event.type === SESSION_EVENT_TYPES.runStarted) {
      const runId = String(event.payload.runId ?? "");
      if (runId) {
        setActiveRun((prev) =>
          prev ?? {
            id: runId,
            sessionId: event.sessionId,
            status: "queued",
            requestedById: event.actorId ?? "",
            prompt: typeof event.payload.prompt === "string" ? event.payload.prompt : null,
            error: null,
            startedAt: null,
            endedAt: null,
            createdAt: event.createdAt,
          }
        );
      }
    }
    if (
      event.type === SESSION_EVENT_TYPES.runCompleted ||
      event.type === SESSION_EVENT_TYPES.runFailed ||
      event.type === SESSION_EVENT_TYPES.runStopped
    ) {
      setActiveRun(null);
      setLive(null);
      setStopping(false);
    }
  }, []);

  const onPresence = useCallback((users: PresenceUser[]) => {
    setPresence(users);
  }, []);

  const onKicked = useCallback(() => {
    toast("You were removed from this session", "error");
    router.replace("/sessions");
  }, [router, toast]);

  const onRunDelta = useCallback((runId: string, text: string) => {
    setLive((prev) => ({
      runId,
      text: prev && prev.runId === runId ? `${prev.text}${text}` : text,
    }));
  }, []);

  const onRunStatus = useCallback((runId: string, status: AgentRunStatusValue) => {
    setActiveRun((prev) => {
      const next: AgentRunDto = prev && prev.id === runId
        ? { ...prev, status }
        : {
            id: runId,
            sessionId: id,
            status,
            requestedById: prev?.requestedById ?? "",
            prompt: prev?.prompt ?? null,
            error: prev?.error ?? null,
            startedAt: prev?.startedAt ?? null,
            endedAt: prev?.endedAt ?? null,
            createdAt: prev?.createdAt ?? new Date().toISOString(),
          };
      return isActiveRunStatus(status) ? next : null;
    });
    if (!isActiveRunStatus(status)) {
      setLive((prev) => (prev && prev.runId === runId ? null : prev));
      setStopping(false);
    }
  }, [id]);

  const { status: realtimeStatus } = useSessionRealtime({
    sessionId: id,
    enabled: !loading && Boolean(session) && Boolean(me),
    onEvent,
    onPresence,
    onKicked,
    onRunDelta,
    onRunStatus,
  });

  useEffect(() => {
    async function load() {
      try {
        const sessionRes = await fetch(`/api/v1/sessions/${id}`);
        const sessionData = await sessionRes.json();
        if (!sessionRes.ok) {
          const msg = sessionData.error ?? "Failed to load session";
          setError(msg);
          toast(msg, "error");
          return;
        }

        const joinRes = await fetch(`/api/v1/sessions/${id}/join`, { method: "POST" });
        const joinData = await joinRes.json();
        if (!joinRes.ok) {
          const msg = joinData.error ?? "Failed to join session";
          setError(msg);
          toast(msg, "error");
          return;
        }

        const s: Session = joinData.session ?? sessionData.session;
        setSession(s);
        setTitle(s.title);
        setType(s.type);
        setRepoUrl(s.repoUrl ?? "");
        setSeverity(s.severity ?? "");
        setStatus(s.status);
        setMe({
          userId: joinData.participant.userId,
          role: joinData.participant.role,
        });
        if (joinData.created) {
          toast("Joined session");
        }

        const eventsRes = await fetch(`/api/v1/sessions/${id}/events`);
        const eventsData = await eventsRes.json();
        if (!eventsRes.ok) {
          const msg = eventsData.error ?? "Failed to load timeline";
          setError(msg);
          toast(msg, "error");
          return;
        }
        setEvents(eventsData.events ?? []);

        const [runsRes, contextRes] = await Promise.all([
          fetch(`/api/v1/sessions/${id}/runs`),
          fetch(`/api/v1/sessions/${id}/context`),
        ]);
        const runsData = await runsRes.json();
        if (runsRes.ok) {
          setActiveRun(runsData.active ?? null);
        }
        const contextData = await contextRes.json();
        if (contextRes.ok) {
          setContexts(contextData.contexts ?? []);
        }
      } catch {
        const msg = "Failed to load session";
        setError(msg);
        toast(msg, "error");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [id, toast]);

  const showSeverity = type === "on_call" || type === "bug";
  const viewerBlocked = !canSendMessages(me?.role);
  const owner = isSessionOwner(me?.role);
  const canManageAgent = canRunAgent(me?.role);

  function openEdit() {
    if (!session) return;
    setTitle(session.title);
    setType(session.type);
    setRepoUrl(session.repoUrl ?? "");
    setSeverity(session.severity ?? "");
    setStatus(session.status);
    setError(null);
    setEditing(true);
  }

  async function onSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/sessions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          type,
          repoUrl: repoUrl || null,
          severity: showSeverity && severity ? severity : null,
          status,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = data.error ?? "Failed to update session";
        setError(msg);
        toast(msg, "error");
        return;
      }
      setSession((prev) => (prev ? { ...prev, ...data.session, participants: prev.participants } : data.session));
      toast("Session saved");
      setEditing(false);
    } catch {
      const msg = "Failed to update session";
      setError(msg);
      toast(msg, "error");
    } finally {
      setSaving(false);
    }
  }

  async function onSend(text: string) {
    setSending(true);
    try {
      const res = await fetch(`/api/v1/sessions/${id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error ?? "Failed to send message", "error");
        return false;
      }
      if (data.event) onEvent(data.event);
      return true;
    } catch {
      toast("Failed to send message", "error");
      return false;
    } finally {
      setSending(false);
    }
  }

  async function copyShareLink() {
    setCopying(true);
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast("Link copied");
    } catch {
      toast("Could not copy link", "error");
    } finally {
      setCopying(false);
    }
  }

  async function onStartAgent(prompt: string) {
    setStarting(true);
    try {
      const res = await fetch(`/api/v1/sessions/${id}/runs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error ?? "Failed to start agent", "error");
        if (data.run) setActiveRun(data.run);
        return false;
      }
      if (data.run) setActiveRun(data.run);
      const nextEvents = Array.isArray(data.events) ? data.events : data.event ? [data.event] : [];
      for (const event of nextEvents) {
        if (event) onEvent(event);
      }
      toast("Agent started");
      return true;
    } catch {
      toast("Failed to start agent", "error");
      return false;
    } finally {
      setStarting(false);
    }
  }

  async function onStopAgent() {
    if (!activeRun) return;
    setStopping(true);
    try {
      const res = await fetch(`/api/v1/sessions/${id}/runs/${activeRun.id}/stop`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error ?? "Failed to stop agent", "error");
        setStopping(false);
        return;
      }
      if (data.event) onEvent(data.event);
      if (data.run && !data.stopping) {
        setActiveRun(isActiveRunStatus(data.run.status) ? data.run : null);
        setStopping(false);
      }
      toast(data.stopping ? "Stopping agent…" : "Agent stopped");
    } catch {
      toast("Failed to stop agent", "error");
      setStopping(false);
    }
  }

  async function onAddContext(kind: string, content: string) {
    setAddingContext(true);
    try {
      const res = await fetch(`/api/v1/sessions/${id}/context`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, content }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error ?? "Failed to add context", "error");
        return false;
      }
      if (data.context) setContexts((prev) => [data.context, ...prev]);
      if (data.event) onEvent(data.event);
      toast("Context added");
      return true;
    } catch {
      toast("Failed to add context", "error");
      return false;
    } finally {
      setAddingContext(false);
    }
  }

  async function onChangeRole(userId: string, role: "viewer" | "contributor") {
    setChangingUserId(userId);
    try {
      const res = await fetch(`/api/v1/sessions/${id}/participants`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error ?? "Failed to update role", "error");
        return;
      }
      if (data.session) setSession(data.session);
      if (data.event) onEvent(data.event);
      toast("Role updated");
    } catch {
      toast("Failed to update role", "error");
    } finally {
      setChangingUserId(null);
    }
  }

  async function onKick(userId: string) {
    const target = session?.participants.find((p) => p.userId === userId);
    const label = target?.user.name || target?.user.email || "this member";
    if (!window.confirm(`Remove ${label} from this session?`)) return;

    setKickingUserId(userId);
    try {
      const res = await fetch(`/api/v1/sessions/${id}/participants`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error ?? "Failed to remove participant", "error");
        return;
      }
      if (data.session) setSession(data.session);
      if (data.event) onEvent(data.event);
      toast("Participant removed");
    } catch {
      toast("Failed to remove participant", "error");
    } finally {
      setKickingUserId(null);
    }
  }

  return (
    <main className="page-room">
      {loading && <SessionRoomSkeleton />}
      {!loading && !session && error && <p className="error-text">{error}</p>}
      {!loading && session && (
        <>
          <div className="room-header">
            <div className="room-header-meta">
              <p className="eyebrow">Session room</p>
              <h1 className="mt-0.5 truncate text-lg font-semibold tracking-tight sm:text-xl">
                {session.title}
              </h1>
              <p className="subtitle mt-0.5 truncate text-xs">
                {SESSION_TYPE_LABELS[session.type]}
                {session.severity ? ` · ${session.severity}` : ""}
                {` · ${session.status}`}
                {` · ${session.owner.name || session.owner.email}`}
              </p>
            </div>
            <div className="room-toolbar">
              <AgentControls
                canManage={canManageAgent}
                activeRun={activeRun}
                starting={starting}
                stopping={stopping}
                onStart={onStartAgent}
                onStop={onStopAgent}
                contexts={contexts}
                addingContext={addingContext}
                onAddContext={onAddContext}
              />
              <button type="button" onClick={openEdit} className="btn-ghost">
                Edit
              </button>
              <button type="button" onClick={copyShareLink} disabled={copying} className="btn-secondary">
                {copying ? <ButtonLoader label="Copying…" /> : "Copy link"}
              </button>
            </div>
          </div>

          <div className="room-grid">
            <PresencePanel
              participants={session.participants}
              presence={presence}
              currentUserId={me?.userId ?? null}
              isOwner={owner}
              onChangeRole={onChangeRole}
              onKick={onKick}
              changingUserId={changingUserId}
              kickingUserId={kickingUserId}
              realtimeStatus={realtimeStatus}
            />
            <section className="room-chat">
              <div className="room-chat-header">
                <h2 className="text-sm font-medium">Timeline</h2>
              </div>
              <Timeline events={events} currentUserId={me?.userId ?? null} live={live} />
              <div className="room-composer">
                <Composer disabled={viewerBlocked} sending={sending} onSend={onSend} />
                {viewerBlocked && (
                  <p className="subtitle mt-2 text-xs">Viewers cannot send messages or start the agent.</p>
                )}
              </div>
            </section>
          </div>

          {editing && (
            <div
              className="modal-backdrop"
              role="presentation"
              onClick={() => {
                if (!saving) setEditing(false);
              }}
            >
              <div
                className="modal-panel"
                role="dialog"
                aria-modal="true"
                aria-labelledby="edit-session-title"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <h2 id="edit-session-title" className="text-lg font-semibold">
                    Edit session
                  </h2>
                  <button
                    type="button"
                    className="btn-ghost px-2"
                    disabled={saving}
                    onClick={() => setEditing(false)}
                  >
                    Close
                  </button>
                </div>
                <form onSubmit={onSave} className="space-y-4">
                  <div>
                    <label className="label" htmlFor="title">
                      Title
                    </label>
                    <input
                      id="title"
                      required
                      disabled={saving}
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="label" htmlFor="type">
                      Type
                    </label>
                    <select
                      id="type"
                      disabled={saving}
                      value={type}
                      onChange={(e) => setType(e.target.value as SessionTypeValue)}
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
                      disabled={saving}
                      value={repoUrl}
                      onChange={(e) => setRepoUrl(e.target.value)}
                      placeholder="https://github.com/acme/payments-api"
                      className="input"
                    />
                  </div>
                  {showSeverity && (
                    <div>
                      <label className="label" htmlFor="severity">
                        Severity
                      </label>
                      <select
                        id="severity"
                        disabled={saving}
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
                  <div>
                    <label className="label" htmlFor="status">
                      Status
                    </label>
                    <select
                      id="status"
                      disabled={saving}
                      value={status}
                      onChange={(e) => setStatus(e.target.value as SessionStatusValue)}
                      className="input"
                    >
                      {SESSION_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                  {error && <p className="error-text">{error}</p>}
                  <div className="flex flex-wrap gap-2">
                    <button type="submit" disabled={saving} className="btn-primary">
                      {saving ? <ButtonLoader label="Saving…" /> : "Save changes"}
                    </button>
                    <button
                      type="button"
                      disabled={saving}
                      className="btn-secondary"
                      onClick={() => setEditing(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </>
      )}
    </main>
  );
}
