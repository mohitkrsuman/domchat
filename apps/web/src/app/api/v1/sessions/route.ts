import { NextResponse } from "next/server";
import { SessionSeverity, SessionType } from "@prisma/client";
import { getPrimaryWorkspace, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

const TYPES = new Set(["on_call", "feature", "bug", "testing", "other"]);
const SEVERITIES = new Set(["sev1", "sev2", "sev3"]);

export async function GET() {
  try {
    const user = await requireUser();
    const membership = await getPrimaryWorkspace(user.id);

    if (!membership) {
      return NextResponse.json({ error: "Create a workspace first" }, { status: 400 });
    }

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
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to list sessions" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const membership = await getPrimaryWorkspace(user.id);

    if (!membership) {
      return NextResponse.json({ error: "Create a workspace first" }, { status: 400 });
    }

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
    if (!TYPES.has(typeRaw)) {
      return NextResponse.json({ error: "Invalid session type" }, { status: 400 });
    }
    if (severityRaw && !SEVERITIES.has(severityRaw)) {
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
      },
      include: {
        owner: { select: { id: true, email: true, name: true } },
      },
    });

    return NextResponse.json({ session }, { status: 201 });
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
  }
}
