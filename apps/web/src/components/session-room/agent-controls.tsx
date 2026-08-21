"use client";

import { FormEvent, useState } from "react";
import { ButtonLoader } from "@/components/ui";
import type { AgentRunDto, SessionContextDto } from "@/lib/agent/types";

const CONTEXT_KINDS = [
  { value: "log", label: "Log" },
  { value: "error_snippet", label: "Error snippet" },
  { value: "note", label: "Note" },
] as const;

function runLabel(run: AgentRunDto | null, stopping: boolean) {
  if (!run) return null;
  if (stopping) return "Stopping…";
  if (run.status === "queued") return "Agent queued";
  if (run.status === "running") return "Agent running";
  if (run.status === "completed") return "Run completed";
  if (run.status === "failed") return "Run failed";
  if (run.status === "stopped") return "Run stopped";
  return null;
}

export function AgentControls({
  canManage,
  activeRun,
  starting,
  stopping,
  onStart,
  onStop,
  contexts,
  addingContext,
  onAddContext,
}: {
  canManage: boolean;
  activeRun: AgentRunDto | null;
  starting: boolean;
  stopping: boolean;
  onStart: (prompt: string) => Promise<boolean>;
  onStop: () => Promise<void>;
  contexts: SessionContextDto[];
  addingContext: boolean;
  onAddContext: (kind: string, content: string) => Promise<boolean>;
}) {
  const [startOpen, setStartOpen] = useState(false);
  const [contextOpen, setContextOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [kind, setKind] = useState<(typeof CONTEXT_KINDS)[number]["value"]>("log");
  const [content, setContent] = useState("");
  const busy = starting || stopping;
  const active = activeRun && (activeRun.status === "queued" || activeRun.status === "running");
  const label = runLabel(active ? activeRun : null, stopping);

  async function submitStart(e: FormEvent) {
    e.preventDefault();
    const ok = await onStart(prompt.trim());
    if (ok) {
      setPrompt("");
      setStartOpen(false);
    }
  }

  async function submitContext(e: FormEvent) {
    e.preventDefault();
    const ok = await onAddContext(kind, content.trim());
    if (ok) {
      setContent("");
      setContextOpen(false);
    }
  }

  return (
    <>
      {label ? (
        <span className={`agent-run-badge${active ? " is-live" : ""}`}>{label}</span>
      ) : null}
      <button type="button" className="btn-ghost" onClick={() => setContextOpen(true)} disabled={!canManage}>
        Add context
      </button>
      {active ? (
        <button type="button" className="btn-secondary" disabled={!canManage || busy} onClick={() => void onStop()}>
          {stopping ? <ButtonLoader label="Stopping…" /> : "Stop"}
        </button>
      ) : (
        <button
          type="button"
          className="btn-primary"
          disabled={!canManage || busy}
          onClick={() => setStartOpen(true)}
        >
          {starting ? <ButtonLoader label="Starting…" /> : "Start agent"}
        </button>
      )}

      {startOpen && (
        <div
          className="modal-backdrop"
          role="presentation"
          onClick={() => {
            if (!starting) setStartOpen(false);
          }}
        >
          <div className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="start-agent-title" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-start justify-between gap-3">
              <h2 id="start-agent-title" className="text-lg font-semibold">
                Start agent
              </h2>
              <button type="button" className="btn-ghost px-2" disabled={starting} onClick={() => setStartOpen(false)}>
                Close
              </button>
            </div>
            <form onSubmit={submitStart} className="space-y-4">
              <div>
                <label className="label" htmlFor="agent-prompt">
                  Prompt <span className="muted">(optional)</span>
                </label>
                <textarea
                  id="agent-prompt"
                  rows={4}
                  disabled={starting}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Investigate this session using the attached context and repo."
                  className="input min-h-[6rem] resize-y"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="submit" disabled={starting} className="btn-primary">
                  {starting ? <ButtonLoader label="Starting…" /> : "Start investigation"}
                </button>
                <button type="button" disabled={starting} className="btn-secondary" onClick={() => setStartOpen(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {contextOpen && (
        <div
          className="modal-backdrop"
          role="presentation"
          onClick={() => {
            if (!addingContext) setContextOpen(false);
          }}
        >
          <div className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="add-context-title" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-start justify-between gap-3">
              <h2 id="add-context-title" className="text-lg font-semibold">
                Add context
              </h2>
              <button type="button" className="btn-ghost px-2" disabled={addingContext} onClick={() => setContextOpen(false)}>
                Close
              </button>
            </div>
            <form onSubmit={submitContext} className="space-y-4">
              <div>
                <label className="label" htmlFor="context-kind">
                  Kind
                </label>
                <select
                  id="context-kind"
                  disabled={addingContext}
                  value={kind}
                  onChange={(e) => setKind(e.target.value as (typeof CONTEXT_KINDS)[number]["value"])}
                  className="input"
                >
                  {CONTEXT_KINDS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="context-content">
                  Content
                </label>
                <textarea
                  id="context-content"
                  required
                  rows={6}
                  disabled={addingContext}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Paste logs, a stack trace, or notes…"
                  className="input min-h-[8rem] resize-y font-mono text-xs"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="submit" disabled={addingContext || !content.trim()} className="btn-primary">
                  {addingContext ? <ButtonLoader label="Adding…" /> : "Add context"}
                </button>
                <button type="button" disabled={addingContext} className="btn-secondary" onClick={() => setContextOpen(false)}>
                  Cancel
                </button>
              </div>
            </form>
            {contexts.length > 0 ? (
              <div className="mt-5 border-t pt-4" style={{ borderColor: "var(--border)" }}>
                <p className="label">Recent attachments</p>
                <ul className="mt-2 space-y-2">
                  {contexts.slice(0, 8).map((item) => (
                    <li key={item.id} className="rounded-lg border px-3 py-2 text-xs" style={{ borderColor: "var(--border)" }}>
                      <p className="font-medium capitalize">{item.kind.replace("_", " ")}</p>
                      <p className="subtitle mt-1 line-clamp-2 whitespace-pre-wrap">{item.content}</p>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </>
  );
}
