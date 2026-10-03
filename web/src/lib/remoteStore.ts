/**
 * In-Memory Remote Pairing Session Store for Next.js API Routes.
 * Enables real-time synchronization between TV and Phone companion remote.
 */

export interface RemoteCommand {
  command:
    | "UP"
    | "DOWN"
    | "LEFT"
    | "RIGHT"
    | "SELECT"
    | "BACK"
    | "HOME"
    | "FULLSCREEN"
    | "PREV_EP"
    | "NEXT_EP"
    | "TV_MODE"
    | "SEARCH"
    | "NAVIGATE";
  payload?: any;
}

export interface RemoteSession {
  code: string;
  createdAt: number;
  lastActive: number;
  tvConnected: boolean;
  phoneConnected: boolean;
  subscribers: Set<(data: string) => void>;
  queuedCommands: RemoteCommand[];
  tvState?: {
    title?: string;
    path?: string;
  };
}

// Global store attached to globalThis to persist across module evaluations
const globalStore = globalThis as unknown as {
  __remoteSessions?: Map<string, RemoteSession>;
};

if (!globalStore.__remoteSessions) {
  globalStore.__remoteSessions = new Map<string, RemoteSession>();
}

const sessions = globalStore.__remoteSessions;

/**
 * Generates a clean, readable 6-digit numeric pairing code (e.g. "849201")
 */
export function generatePairingCode(): string {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += Math.floor(Math.random() * 10).toString();
  }
  // Ensure uniqueness
  if (sessions.has(code)) {
    return generatePairingCode();
  }
  return code;
}

/**
 * Creates or resets a remote session for a given code.
 */
export function createSession(code?: string): RemoteSession {
  cleanExpiredSessions();
  const sessionCode = code || generatePairingCode();

  const session: RemoteSession = {
    code: sessionCode,
    createdAt: Date.now(),
    lastActive: Date.now(),
    tvConnected: true,
    phoneConnected: false,
    subscribers: new Set(),
    queuedCommands: [],
  };

  sessions.set(sessionCode, session);
  return session;
}

/**
 * Retrieves an active session by code.
 */
export function getSession(code: string): RemoteSession | undefined {
  cleanExpiredSessions();
  const cleanCode = code.replace(/[^0-9]/g, "");
  return sessions.get(cleanCode);
}

/**
 * Dispatches a command from Phone to TV.
 */
export function dispatchCommand(code: string, command: RemoteCommand): boolean {
  const cleanCode = code.replace(/[^0-9]/g, "");
  const session = sessions.get(cleanCode);
  if (!session) return false;

  session.lastActive = Date.now();
  session.queuedCommands.push(command);

  // Keep queue manageable
  if (session.queuedCommands.length > 25) {
    session.queuedCommands.shift();
  }

  // Broadcast to all active subscribers (TV SSE streams)
  const message = JSON.stringify({ type: "command", ...command, timestamp: Date.now() });
  for (const subscriber of session.subscribers) {
    try {
      subscriber(message);
    } catch {
      // Ignored if stream closed
    }
  }

  return true;
}

/**
 * Updates session status (e.g., phone joined, TV state).
 */
export function updateSessionStatus(
  code: string,
  update: { tvConnected?: boolean; phoneConnected?: boolean; tvState?: any }
) {
  const cleanCode = code.replace(/[^0-9]/g, "");
  const session = sessions.get(cleanCode);
  if (!session) return;

  if (update.tvConnected !== undefined) session.tvConnected = update.tvConnected;
  if (update.phoneConnected !== undefined) session.phoneConnected = update.phoneConnected;
  if (update.tvState !== undefined) session.tvState = update.tvState;

  session.lastActive = Date.now();

  const statusMsg = JSON.stringify({
    type: "status",
    phoneConnected: session.phoneConnected,
    tvConnected: session.tvConnected,
    tvState: session.tvState,
  });

  for (const subscriber of session.subscribers) {
    try {
      subscriber(statusMsg);
    } catch {}
  }
}

/**
 * Cleans sessions older than 2 hours of inactivity.
 */
function cleanExpiredSessions() {
  const now = Date.now();
  const TWO_HOURS = 2 * 60 * 60 * 1000;

  for (const [code, session] of sessions.entries()) {
    if (now - session.lastActive > TWO_HOURS) {
      sessions.delete(code);
    }
  }
}
