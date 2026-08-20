import { NextResponse } from "next/server";
import { SessionSeverity, SessionStatus, SessionType } from "@prisma/client";
import { jsonError, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { loadWorkspaceSession, sessionDetailInclude } from "@/lib/session-access";
import { isSessionSeverity, isSessionStatus, isSessionType } from "@/lib/session-fields";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const { session } = await loadWorkspaceSession(user.id, id);

    if (!session) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const me = session.participants.find((p) => p.userId === user.id) ?? null;

    return NextResponse.json({
      session,
      me: me ? { userId: me.userId, role: me.role } : null,
    });
  } catch (e) {
    const { body, status } = jsonError(e, "Failed to load session");
    return NextResponse.json(body, { status });
  }
}

export async function PATCH(req: Request, { params }: Params) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const { session: existing } = await loadWorkspaceSession(user.id, id);

    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await req.json();
    const data: {
      title?: string;
      type?: SessionType;
      severity?: SessionSeverity | null;
      repoUrl?: string | null;
      status?: SessionStatus;
    } = {};

    if (typeof body.title === "string") {
      const title = body.title.trim();
      if (!title) {
        return NextResponse.json({ error: "Title is required" }, { status: 400 });
      }
      data.title = title;
    }

    if (typeof body.type === "string") {
      if (!isSessionType(body.type)) {
        return NextResponse.json({ error: "Invalid session type" }, { status: 400 });
      }
      data.type = body.type;
    }

    if (body.severity === null || body.severity === "") {
      data.severity = null;
    } else if (typeof body.severity === "string") {
      if (!isSessionSeverity(body.severity)) {
        return NextResponse.json({ error: "Invalid severity" }, { status: 400 });
      }
      data.severity = body.severity;
    }

    if (body.repoUrl === null || body.repoUrl === "") {
      data.repoUrl = null;
    } else if (typeof body.repoUrl === "string") {
      data.repoUrl = body.repoUrl.trim();
    }

    if (typeof body.status === "string") {
      if (!isSessionStatus(body.status)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }
      data.status = body.status;
    }

    const session = await prisma.session.update({
      where: { id: existing.id },
      data,
      include: sessionDetailInclude,
    });

    return NextResponse.json({ session });
  } catch (e) {
    const { body, status } = jsonError(e, "Failed to update session");
    return NextResponse.json(body, { status });
  }
}
