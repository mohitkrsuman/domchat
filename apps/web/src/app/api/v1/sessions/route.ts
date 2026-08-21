import { NextResponse } from "next/server";
import { SessionSeverity, SessionType } from "@/generated/prisma";
import { jsonError, requireUser, requireWorkspace } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { SESSION_EVENT_TYPES } from "@/lib/realtime-protocol";
import { sessionDetailInclude } from "@/lib/session-access";
import { appendSessionEvent } from "@/lib/session-events";
import { isSessionSeverity, isSessionType } from "@/lib/session-fields";

export async function GET() {
  try {
    const user = await requireUser();
    const membership = await requireWorkspace(user.id);

    const sessions = await prisma.session.findMany({
      where: { workspaceId: membership.workspaceId },
      orderBy: { updatedAt: "desc" },
      include: {
        owner: { select: { id: true, email: true, name: true } },
        createdBy: { select: { id: true, email: true, name: true } },
      },
    });

    return NextResponse.json({ sessions });
  } catch (e) {
    const { body, status } = jsonError(e, "Failed to list sessions");
    return NextResponse.json(body, { status });
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const membership = await requireWorkspace(user.id);

    const body = await req.json();
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const repoUrl =
      typeof body.repoUrl === "string" && body.repoUrl.trim()
        ? body.repoUrl.trim()
        : null;
    const typeRaw = typeof body.type === "string" ? body.type : "other";
    const severityRaw =
      typeof body.severity === "string" && body.severity ? body.severity : null;

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }
    if (!isSessionType(typeRaw)) {
      return NextResponse.json({ error: "Invalid session type" }, { status: 400 });
    }
    if (severityRaw && !isSessionSeverity(severityRaw)) {
      return NextResponse.json({ error: "Invalid severity" }, { status: 400 });
    }

    const session = await prisma.session.create({
      data: {
        title,
        repoUrl,
        type: typeRaw as SessionType,
        severity: severityRaw ? (severityRaw as SessionSeverity) : null,
        status: "open",
        workspaceId: membership.workspaceId,
        ownerId: user.id,
        createdById: user.id,
        participants: {
          create: {
            userId: user.id,
            role: "owner",
          },
        },
      },
      include: sessionDetailInclude,
    });

    await appendSessionEvent({
      sessionId: session.id,
      type: SESSION_EVENT_TYPES.sessionCreated,
      actorId: user.id,
      payload: { title, type: typeRaw, repoUrl },
    });

    return NextResponse.json({ session }, { status: 201 });
  } catch (e) {
    const { body, status } = jsonError(e, "Failed to create session");
    return NextResponse.json(body, { status });
  }
}
