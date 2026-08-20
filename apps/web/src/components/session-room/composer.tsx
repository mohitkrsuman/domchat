"use client";

import { FormEvent, KeyboardEvent, useState } from "react";
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

  async function submit() {
    const value = text.trim();
    if (!value || disabled || sending) return;
    const ok = await onSend(value);
    if (ok) setText("");
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    await submit();
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void submit();
    }
  }

  return (
    <form onSubmit={onSubmit} className="room-composer-form">
      <textarea
        id="message"
        rows={2}
        disabled={disabled || sending}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={disabled ? "Viewers cannot send messages" : "Message the room…"}
        className="input mt-0 min-h-[2.75rem] resize-none"
        aria-label="Message"
      />
      <button type="submit" disabled={disabled || sending || !text.trim()} className="btn-primary shrink-0">
        {sending ? <ButtonLoader label="Sending…" /> : "Send"}
      </button>
    </form>
  );
}
