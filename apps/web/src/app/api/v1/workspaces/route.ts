import { NextResponse } from "next/server";
import { getPrimaryWorkspace, jsonError, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const user = await requireUser();
    const membership = await getPrimaryWorkspace(user.id);

    if (!membership) {
      return NextResponse.json({ workspace: null, membership: null, members: [] });
    }

    const members = await prisma.workspaceMember.findMany({
      where: { workspaceId: membership.workspaceId },
      include: { user: { select: { id: true, email: true, name: true } } },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({
      workspace: membership.workspace,
      membership: {
        role: membership.role,
        userId: membership.userId,
        workspaceId: membership.workspaceId,
      },
      members: members.map((m) => ({
        userId: m.user.id,
        email: m.user.email,
        name: m.user.name,
        role: m.role,
        createdAt: m.createdAt,
      })),
    });
  } catch (e) {
    const { body, status } = jsonError(e, "Failed to load workspace");
    return NextResponse.json(body, { status });
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
    const { body, status } = jsonError(e, "Failed to create workspace");
    return NextResponse.json(body, { status });
  }
}
