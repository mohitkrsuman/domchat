"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { PresenceUser, ServerToClient, TimelineEvent } from "@/lib/realtime-protocol";

export type RealtimeStatus = "connecting" | "live" | "offline";

function wsUrl() {
  return process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:4001";
}

export function useSessionRealtime({
  sessionId,
  enabled,
  onEvent,
  onPresence,
}: {
  sessionId: string;
  enabled: boolean;
  onEvent: (event: TimelineEvent) => void;
  onPresence: (users: PresenceUser[]) => void;
}) {
  const onEventRef = useRef(onEvent);
  const onPresenceRef = useRef(onPresence);
  onEventRef.current = onEvent;
  onPresenceRef.current = onPresence;
  const [status, setStatus] = useState<RealtimeStatus>("offline");

  useEffect(() => {
    if (!enabled) {
      setStatus("offline");
      return;
    }

    let closed = false;
    let socket: WebSocket | null = null;
    let ping: number | undefined;
    let reconnect: number | undefined;

    async function connect() {
      setStatus("connecting");
      const supabase = createClient();
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token || closed) {
        setStatus("offline");
        return;
      }

      let ws: WebSocket;
      try {
        ws = new WebSocket(`${wsUrl()}/ws`);
      } catch {
        setStatus("offline");
        if (!closed) {
          reconnect = window.setTimeout(() => {
            void connect();
          }, 2000);
        }
        return;
      }
      socket = ws;

      ws.onopen = () => {
        ws.send(JSON.stringify({ type: "join", sessionId, token }));
        ping = window.setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "presence.ping" }));
          }
        }, 20_000);
      };

      ws.onmessage = (ev) => {
        let message: ServerToClient;
        try {
          message = JSON.parse(String(ev.data)) as ServerToClient;
        } catch {
          return;
        }
        if (message.type === "error") {
          setStatus("offline");
          return;
        }
        if (message.type === "joined") {
          setStatus("live");
          return;
        }
        if (message.type === "event.append") {
          onEventRef.current(message.event);
        }
        if (message.type === "presence.update") {
          setStatus("live");
          onPresenceRef.current(message.users);
        }
      };

      ws.onerror = () => {
        setStatus("offline");
      };

      ws.onclose = () => {
        if (ping) window.clearInterval(ping);
        setStatus("offline");
        if (!closed) {
          reconnect = window.setTimeout(() => {
            void connect();
          }, 2000);
        }
      };
    }

    void connect();

    return () => {
      closed = true;
      if (ping) window.clearInterval(ping);
      if (reconnect) window.clearTimeout(reconnect);
      socket?.close();
    };
  }, [enabled, sessionId]);

  return { status };
}
