"use client";

import { FormEvent, useState } from "react";
import { ButtonLoader } from "@/components/ui";

export function Composer({
  disabled,
  sending,
  onSend,
}: {
  disabled: boolean;
  sending: boolean;
  onSend: (text: string) => Promise<boolean>;
}) {
  const [text, setText] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const value = text.trim();
    if (!value) return;
    const ok = await onSend(value);
    if (ok) setText("");
  }

  return (
    <form onSubmit={onSubmit} className="mt-4 space-y-3">
      <label className="label" htmlFor="message">
        Message
      </label>
      <textarea
        id="message"
        rows={3}
        disabled={disabled || sending}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={disabled ? "Viewers cannot send messages" : "Write a message to the room"}
        className="input min-h-[5rem] resize-y"
      />
      <button type="submit" disabled={disabled || sending || !text.trim()} className="btn-primary">
        {sending ? <ButtonLoader label="Sending…" /> : "Send"}
      </button>
    </form>
  );
}
