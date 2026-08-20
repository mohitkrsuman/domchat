import { NextResponse } from "next/server";

type Params = { params: Promise<{ path: string[] }> };

export async function GET(_req: Request, _ctx: Params) {
  return NextResponse.json(
    { error: "Not found", code: "NOT_FOUND" },
    { status: 404 }
  );
}

export async function POST(_req: Request, _ctx: Params) {
  return NextResponse.json(
    { error: "Not found", code: "NOT_FOUND" },
    { status: 404 }
  );
}

export async function PUT(_req: Request, _ctx: Params) {
  return NextResponse.json(
    { error: "Not found", code: "NOT_FOUND" },
    { status: 404 }
  );
}

export async function PATCH(_req: Request, _ctx: Params) {
  return NextResponse.json(
    { error: "Not found", code: "NOT_FOUND" },
    { status: 404 }
  );
}

export async function DELETE(_req: Request, _ctx: Params) {
  return NextResponse.json(
    { error: "Not found", code: "NOT_FOUND" },
    { status: 404 }
  );
}
