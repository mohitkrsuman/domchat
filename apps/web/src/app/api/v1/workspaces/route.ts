import { NextResponse } from "next/server";
import { getPrimaryWorkspace, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const user = await requireUser();
    const membership = await getPrimaryWorkspace(user.id);

    if (!membership) {
      return NextResponse.json({ workspace: null, membership: null });
    }

    return NextResponse.json({
      workspace: membership.workspace,
      membership: {
        role: membership.role,
        userId: membership.userId,
        workspaceId: membership.workspaceId,
      },
    });
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to load workspace" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";

    if (!name) {
      return NextResponse.json({ error: "Workspace name is required" }, { status: 400 });
    }

    const existing = await getPrimaryWorkspace(user.id);
    if (existing) {
      return NextResponse.json(
        { error: "You already have a workspace", workspace: existing.workspace },
        { status: 409 }
      );
    }

    const workspace = await prisma.workspace.create({
      data: {
        name,
        members: {
          create: {
            userId: user.id,
            role: "admin",
          },
        },
      },
    });

    return NextResponse.json({ workspace }, { status: 201 });
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to create workspace" }, { status: 500 });
  }
}
