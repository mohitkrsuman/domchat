import { NextResponse } from "next/server";
import { jsonError, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { asTimelineEvent } from "@/lib/realtime-protocol";
import { loadWorkspaceSession, sessionAccessError } from "@/lib/session-access";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Params) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const access = await loadWorkspaceSession(user.id, id);

    if (!access.ok) {
      const { body, status } = sessionAccessError(access);
      return NextResponse.json(body, { status });
    }

    const url = new URL(req.url);
    const limitRaw = Number(url.searchParams.get("limit") ?? "200");
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 500) : 200;

    const events = await prisma.sessionEvent.findMany({
      where: { sessionId: id },
      orderBy: { createdAt: "asc" },
      take: limit,
      include: { actor: { select: { id: true, email: true, name: true } } },
    });

    return NextResponse.json({ events: events.map(asTimelineEvent) });
  } catch (e) {
    const { body, status } = jsonError(e, "Failed to load events");
    return NextResponse.json(body, { status });
  }
}
