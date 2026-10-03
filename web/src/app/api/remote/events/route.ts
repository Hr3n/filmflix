import { NextRequest } from "next/server";
import { getSession, updateSessionStatus } from "@/lib/remoteStore";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const role = (searchParams.get("role") || "tv") as "tv" | "phone";

  if (!code) {
    return new Response("Missing pairing code", { status: 400 });
  }

  const session = getSession(code);
  if (!session) {
    return new Response("Session not found", { status: 404 });
  }

  // Update connection status
  if (role === "phone") {
    updateSessionStatus(code, { phoneConnected: true });
  } else {
    updateSessionStatus(code, { tvConnected: true });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection event
      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({
            type: "connected",
            role,
            code: session.code,
            phoneConnected: session.phoneConnected,
            tvConnected: session.tvConnected,
          })}\n\n`
        )
      );

      // Subscribe to real-time events
      const subscriber = (data: string) => {
        try {
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        } catch {
          // Closed stream
        }
      };

      session.subscribers.add(subscriber);

      // Keepalive heartbeat every 15s to keep connection open
      const interval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: keepalive\n\n`));
        } catch {
          clearInterval(interval);
        }
      }, 15000);

      req.signal.addEventListener("abort", () => {
        clearInterval(interval);
        session.subscribers.delete(subscriber);
        if (role === "phone") {
          updateSessionStatus(code, { phoneConnected: false });
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
