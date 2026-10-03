import { NextRequest, NextResponse } from "next/server";
import { createSession, getSession } from "@/lib/remoteStore";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const requestedCode = body.code ? String(body.code) : undefined;
    const session = createSession(requestedCode);

    return NextResponse.json({
      success: true,
      code: session.code,
      message: "Remote pairing session created",
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.json({ valid: false, error: "Missing code" }, { status: 400 });
  }

  const session = getSession(code);
  if (!session) {
    return NextResponse.json({ valid: false, message: "Code expired or not found" }, { status: 404 });
  }

  return NextResponse.json({
    valid: true,
    code: session.code,
    tvConnected: session.tvConnected,
    phoneConnected: session.phoneConnected,
    tvState: session.tvState,
  });
}
