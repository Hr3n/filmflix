import { NextRequest, NextResponse } from "next/server";
import { dispatchCommand, RemoteCommand } from "@/lib/remoteStore";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { code, command, payload } = body;

    if (!code || !command) {
      return NextResponse.json({ success: false, error: "Missing code or command" }, { status: 400 });
    }

    const validCommands: RemoteCommand["command"][] = [
      "UP",
      "DOWN",
      "LEFT",
      "RIGHT",
      "SELECT",
      "BACK",
      "HOME",
      "FULLSCREEN",
      "PREV_EP",
      "NEXT_EP",
      "TV_MODE",
      "SEARCH",
      "NAVIGATE",
    ];

    if (!validCommands.includes(command)) {
      return NextResponse.json({ success: false, error: "Invalid command" }, { status: 400 });
    }

    const dispatched = dispatchCommand(code, { command, payload });

    if (!dispatched) {
      return NextResponse.json(
        { success: false, error: "TV session not found or disconnected" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, command });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
