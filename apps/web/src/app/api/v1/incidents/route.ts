import { NextResponse } from "next/server";
import { getPrimaryWorkspace, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

const SEVERITIES = ["sev1", "sev2", "sev3"] as const;
type IncidentSeverity = (typeof SEVERITIES)[number];

function isIncidentSeverity(value: string): value is IncidentSeverity {
  return (SEVERITIES as readonly string[]).includes(value);
}

export async function GET() {
  try {
    const user = await requireUser();
    const membership = await getPrimaryWorkspace(user.id);

    if (!membership) {
      return NextResponse.json({ error: "Create a workspace first" }, { status: 400 });
    }

    const incidents = await prisma.incident.findMany({
      where: { workspaceId: membership.workspaceId },
      orderBy: { updatedAt: "desc" },
      include: {
        owner: { select: { id: true, email: true, name: true } },
        createdBy: { select: { id: true, email: true, name: true } },
      },
    });

    return NextResponse.json({ incidents });
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to list incidents" }, { status: 500 });
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
    const repoUrl = typeof body.repoUrl === "string" ? body.repoUrl.trim() : "";
    const severityRaw = typeof body.severity === "string" ? body.severity : "sev2";

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }
    if (!repoUrl) {
      return NextResponse.json({ error: "Repo URL is required" }, { status: 400 });
    }
    if (!isIncidentSeverity(severityRaw)) {
      return NextResponse.json({ error: "Invalid severity" }, { status: 400 });
    }

    const incident = await prisma.incident.create({
      data: {
        title,
        repoUrl,
        severity: severityRaw,
        status: "open",
        workspaceId: membership.workspaceId,
        ownerId: user.id,
        createdById: user.id,
      },
      include: {
        owner: { select: { id: true, email: true, name: true } },
      },
    });

    return NextResponse.json({ incident }, { status: 201 });
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to create incident" }, { status: 500 });
  }
}
