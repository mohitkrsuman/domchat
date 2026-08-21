import { NextResponse } from "next/server";
import { WorkspaceRole } from "@/generated/prisma";
import { jsonError, requireUser, requireWorkspace } from "@/lib/auth";
import { prisma } from "@/lib/db";

const ROLES = new Set(["admin", "member"]);

function serializeMember(m: {
  role: WorkspaceRole;
  createdAt: Date;
  user: { id: string; email: string; name: string | null };
}) {
  return {
    userId: m.user.id,
    email: m.user.email,
    name: m.user.name,
    role: m.role,
    createdAt: m.createdAt,
  };
}

export async function GET() {
  try {
    const user = await requireUser();
    const membership = await requireWorkspace(user.id);

    const members = await prisma.workspaceMember.findMany({
      where: { workspaceId: membership.workspaceId },
      include: { user: { select: { id: true, email: true, name: true } } },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ members: members.map(serializeMember) });
  } catch (e) {
    const { body, status } = jsonError(e, "Failed to load members");
    return NextResponse.json(body, { status });
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const membership = await requireWorkspace(user.id);

    if (membership.role !== "admin") {
      throw new Error("FORBIDDEN");
    }

    const body = await req.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const roleRaw = typeof body.role === "string" ? body.role : "member";

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }
    if (!ROLES.has(roleRaw)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    const target = await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
    });

    if (!target) {
      return NextResponse.json(
        { error: "No user with that email. They need to sign up first." },
        { status: 404 }
      );
    }

    if (target.id === user.id) {
      return NextResponse.json({ error: "You are already in this workspace" }, { status: 409 });
    }

    const existing = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: membership.workspaceId,
          userId: target.id,
        },
      },
    });

    if (existing) {
      return NextResponse.json({ error: "User is already a member" }, { status: 409 });
    }

    const created = await prisma.workspaceMember.create({
      data: {
        workspaceId: membership.workspaceId,
        userId: target.id,
        role: roleRaw as WorkspaceRole,
      },
      include: { user: { select: { id: true, email: true, name: true } } },
    });

    return NextResponse.json({ member: serializeMember(created) }, { status: 201 });
  } catch (e) {
    const { body, status } = jsonError(e, "Failed to add member");
    return NextResponse.json(body, { status });
  }
}
