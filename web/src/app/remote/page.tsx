"use client";
import { Suspense, useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

function RemoteController() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialCode = searchParams.get("code") || "";

  const [code, setCode] = useState(initialCode);
  const [inputCode, setInputCode] = useState(initialCode);
  const [isConnected, setIsConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [hapticEnabled, setHapticEnabled] = useState(true);
  const [tvSearchText, setTvSearchText] = useState("");
  const [lastSentCommand, setLastSentCommand] = useState<string | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);

  const triggerHaptic = useCallback((intensity = 15) => {
    if (!hapticEnabled) return;
    try {
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(intensity);
      }
    } catch {}
  }, [hapticEnabled]);

  // Connect to TV session
  const connectToTv = useCallback(async (codeToConnect: string) => {
    const clean = codeToConnect.replace(/[^0-9]/g, "");
    if (clean.length < 4) {
      setErrorMsg("Please enter a valid TV pairing code");
      return;
    }

    setConnecting(true);
    setErrorMsg("");

    try {
      const res = await fetch(`/api/remote/session?code=${clean}`);
      const data = await res.json();

      if (!res.ok || !data.valid) {
        setErrorMsg(data.message || "TV code not found or expired. Check the TV screen.");
        setConnecting(false);
        setIsConnected(false);
        return;
      }

      setCode(clean);
      setIsConnected(true);
      setConnecting(false);
      triggerHaptic(30);

      // Start SSE connection for real-time link
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      const es = new EventSource(`/api/remote/events?code=${clean}&role=phone`);
      es.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === "status" && payload.tvConnected === false) {
            // TV disconnected
          }
        } catch {}
      };
      eventSourceRef.current = es;
    } catch (err: any) {
      setErrorMsg("Failed to connect to TV. Make sure you are on the same network.");
      setConnecting(false);
      setIsConnected(false);
    }
  }, [triggerHaptic]);

  // Auto-connect if code is in query params
  useEffect(() => {
    if (initialCode) {
      connectToTv(initialCode);
    }
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [initialCode, connectToTv]);

  // Send command to TV
  const sendCommand = async (command: string, payload?: any) => {
    if (!code) return;
    triggerHaptic(18);
    setLastSentCommand(command);
    setTimeout(() => setLastSentCommand(null), 400);

    try {
      await fetch("/api/remote/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, command, payload }),
      });
    } catch (err) {
      console.error("Failed to send command:", err);
    }
  };

  const handleDisconnect = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    setIsConnected(false);
    setCode("");
    setInputCode("");
    router.replace("/remote");
  };

  const handleSendSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tvSearchText.trim()) return;
    sendCommand("SEARCH", { query: tvSearchText.trim() });
    setTvSearchText("");
  };

  // If not connected, show PIN entry screen
  if (!isConnected) {
    return (
      <main className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-6 selection:bg-indigo-500 selection:text-white">
        <div className="w-full max-w-sm flex flex-col items-center text-center">
          {/* Logo / Icon */}
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-2xl shadow-indigo-500/30 mb-5">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>

          <h1 className="text-2xl font-black tracking-tight text-white mb-1.5">
            FilmFlix TV Remote
          </h1>
          <p className="text-xs text-zinc-400 mb-8 max-w-xs">
            Enter the 6-digit code shown on your TV screen to pair and control it immediately.
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              connectToTv(inputCode);
            }}
            className="w-full space-y-4"
          >
            <div>
              <input
                type="text"
                pattern="[0-9]*"
                inputMode="numeric"
                maxLength={6}
                placeholder="• • • • • •"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value.replace(/[^0-9]/g, ""))}
                className="w-full py-4 px-4 bg-zinc-900/90 border border-zinc-700/80 rounded-2xl text-center text-3xl font-mono font-black tracking-widest text-indigo-400 placeholder-zinc-600 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 shadow-inner"
                autoFocus
              />
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold">
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={connecting || inputCode.length < 4}
              className="w-full py-3.5 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 disabled:opacity-50 text-white font-bold text-sm transition-all shadow-xl shadow-indigo-600/30 min-h-[48px] flex items-center justify-center gap-2"
            >
              {connecting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Connecting...
                </>
              ) : (
                "Connect to TV"
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <Link
              href="/"
              className="text-xs text-zinc-500 hover:text-zinc-300 transition"
            >
              ← Back to Web Catalog
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // Active TV Companion Remote Interface
  return (
    <main className="min-h-screen bg-zinc-950 text-white flex flex-col justify-between p-4 max-w-md mx-auto select-none pt-[max(env(safe-area-inset-top),1rem)] pb-[max(env(safe-area-inset-bottom),1rem)]">
      {/* Remote Status Header */}
      <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <div>
            <div className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>Living Room TV</span>
              <span className="text-[10px] font-mono font-medium text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">
                {code}
              </span>
            </div>
            <div className="text-[10px] text-zinc-400">Remote Connected</div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setHapticEnabled(!hapticEnabled)}
            className={`p-2 rounded-xl border text-xs transition ${
              hapticEnabled
                ? "bg-indigo-600/20 text-indigo-400 border-indigo-500/30"
                : "bg-zinc-900 text-zinc-500 border-zinc-800"
            }`}
            title="Toggle Haptic Feedback"
          >
            📳
          </button>

          <button
            onClick={handleDisconnect}
            className="px-2.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 text-xs transition"
          >
            Disconnect
          </button>
        </div>
      </div>

      {/* Main Touch Controller Space */}
      <div className="flex-1 flex flex-col justify-center py-4 space-y-6">
        {/* Quick Search on TV Input (Type on Phone -> Sends to TV!) */}
        <form onSubmit={handleSendSearch} className="relative">
          <input
            type="text"
            placeholder="Type here to search on TV..."
            value={tvSearchText}
            onChange={(e) => setTvSearchText(e.target.value)}
            className="w-full bg-zinc-900/90 border border-zinc-800 rounded-2xl py-3 pl-4 pr-20 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 shadow-inner"
          />
          <button
            type="submit"
            className="absolute inset-y-1.5 right-1.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-bold text-xs transition shadow-md shadow-indigo-600/20 flex items-center justify-center"
          >
            Send ↗
          </button>
        </form>

        {/* Tactile D-Pad Controller */}
        <div className="relative w-64 h-64 mx-auto flex items-center justify-center">
          {/* Outer Ring Background */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-b from-zinc-900 to-zinc-950 border border-zinc-800 shadow-2xl"></div>

          {/* D-Pad Buttons */}
          {/* UP */}
          <button
            onClick={() => sendCommand("UP")}
            className="absolute top-2 w-20 h-16 rounded-t-full bg-zinc-800/80 hover:bg-indigo-600 active:bg-indigo-500 active:scale-95 text-white flex items-center justify-center text-xl transition-all shadow"
            title="Up"
          >
            ▲
          </button>

          {/* LEFT */}
          <button
            onClick={() => sendCommand("LEFT")}
            className="absolute left-2 w-16 h-20 rounded-l-full bg-zinc-800/80 hover:bg-indigo-600 active:bg-indigo-500 active:scale-95 text-white flex items-center justify-center text-xl transition-all shadow"
            title="Left"
          >
            ◄
          </button>

          {/* OK / SELECT Center Button */}
          <button
            onClick={() => sendCommand("SELECT")}
            className={`z-10 w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 active:scale-90 text-white font-black text-sm flex items-center justify-center shadow-xl shadow-indigo-600/40 transition-transform border border-indigo-400/40 ${
              lastSentCommand === "SELECT" ? "scale-90 ring-4 ring-indigo-400" : ""
            }`}
            title="OK / Select"
          >
            OK
          </button>

          {/* RIGHT */}
          <button
            onClick={() => sendCommand("RIGHT")}
            className="absolute right-2 w-16 h-20 rounded-r-full bg-zinc-800/80 hover:bg-indigo-600 active:bg-indigo-500 active:scale-95 text-white flex items-center justify-center text-xl transition-all shadow"
            title="Right"
          >
            ►
          </button>

          {/* DOWN */}
          <button
            onClick={() => sendCommand("DOWN")}
            className="absolute bottom-2 w-20 h-16 rounded-b-full bg-zinc-800/80 hover:bg-indigo-600 active:bg-indigo-500 active:scale-95 text-white flex items-center justify-center text-xl transition-all shadow"
            title="Down"
          >
            ▼
          </button>
        </div>

        {/* Primary TV Navigation Controls */}
        <div className="grid grid-cols-4 gap-2">
          <button
            onClick={() => sendCommand("BACK")}
            className="py-3 px-2 rounded-2xl bg-zinc-900 hover:bg-zinc-800 active:scale-95 border border-zinc-800 text-xs font-semibold text-zinc-300 hover:text-white flex flex-col items-center gap-1 transition"
          >
            <span className="text-base">↩</span>
            <span className="text-[10px]">Back</span>
          </button>

          <button
            onClick={() => sendCommand("HOME")}
            className="py-3 px-2 rounded-2xl bg-zinc-900 hover:bg-zinc-800 active:scale-95 border border-zinc-800 text-xs font-semibold text-zinc-300 hover:text-white flex flex-col items-center gap-1 transition"
          >
            <span className="text-base">🏠</span>
            <span className="text-[10px]">Home</span>
          </button>

          <button
            onClick={() => sendCommand("FULLSCREEN")}
            className="py-3 px-2 rounded-2xl bg-zinc-900 hover:bg-zinc-800 active:scale-95 border border-zinc-800 text-xs font-semibold text-zinc-300 hover:text-white flex flex-col items-center gap-1 transition"
          >
            <span className="text-base">⛶</span>
            <span className="text-[10px]">Fullscreen</span>
          </button>

          <button
            onClick={() => sendCommand("TV_MODE")}
            className="py-3 px-2 rounded-2xl bg-zinc-900 hover:bg-zinc-800 active:scale-95 border border-zinc-800 text-xs font-semibold text-zinc-300 hover:text-white flex flex-col items-center gap-1 transition"
          >
            <span className="text-base">📺</span>
            <span className="text-[10px]">TV Mode</span>
          </button>
        </div>

        {/* Episode / Media Controls */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => sendCommand("PREV_EP")}
            className="py-3 px-4 rounded-2xl bg-zinc-900/90 hover:bg-zinc-800 active:scale-95 border border-zinc-800 text-xs font-semibold text-zinc-300 flex items-center justify-center gap-2 transition"
          >
            <span>⏮</span>
            <span>Prev Episode</span>
          </button>

          <button
            onClick={() => sendCommand("NEXT_EP")}
            className="py-3 px-4 rounded-2xl bg-zinc-900/90 hover:bg-zinc-800 active:scale-95 border border-zinc-800 text-xs font-semibold text-indigo-400 flex items-center justify-center gap-2 transition"
          >
            <span>Next Episode</span>
            <span>⏭</span>
          </button>
        </div>
      </div>

      {/* Quick Category Buttons Bar */}
      <div className="pt-2 border-t border-zinc-900 flex items-center justify-between text-xs text-zinc-400">
        <button
          onClick={() => sendCommand("NAVIGATE", { path: "/?filter=movie" })}
          className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:text-white border border-zinc-800"
        >
          🎬 Movies
        </button>
        <button
          onClick={() => sendCommand("NAVIGATE", { path: "/?filter=tv" })}
          className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:text-white border border-zinc-800"
        >
          📺 Series
        </button>
        <button
          onClick={() => sendCommand("NAVIGATE", { path: "/" })}
          className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:text-white border border-zinc-800"
        >
          ⭐ All
        </button>
      </div>
    </main>
  );
}

export default function RemotePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      }
    >
      <RemoteController />
    </Suspense>
  );
}
