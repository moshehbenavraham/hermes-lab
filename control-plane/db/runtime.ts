import { env } from "cloudflare:workers";

type HermesRuntimeEnv = {
  DB?: D1Database;
  HERMES_STATE?: R2Bucket;
  AGENT_BRIDGE_TOKEN?: string;
  HERMES_TUNNEL_TOKEN?: string;
};

export function getRuntimeEnv(): HermesRuntimeEnv {
  return env as unknown as HermesRuntimeEnv;
}

export function getD1(): D1Database {
  const db = getRuntimeEnv().DB;
  if (!db) throw new Error("D1 binding DB is unavailable.");
  return db;
}

export function getStateBucket(): R2Bucket {
  const bucket = getRuntimeEnv().HERMES_STATE;
  if (!bucket) throw new Error("R2 binding HERMES_STATE is unavailable.");
  return bucket;
}

export async function ensureSchema() {
  const db = getD1();
  await db.batch([
    db
      .prepare(
        `CREATE TABLE IF NOT EXISTS hermes_jobs (
          id TEXT PRIMARY KEY,
          prompt TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'queued',
          requested_by TEXT,
          created_at TEXT NOT NULL,
          claimed_at TEXT,
          completed_at TEXT,
          result_summary TEXT
        )`,
      ),
    db.prepare(
      "CREATE INDEX IF NOT EXISTS hermes_jobs_status_created_idx ON hermes_jobs(status, created_at)",
    ),
    db
      .prepare(
        `CREATE TABLE IF NOT EXISTS hermes_events (
          id TEXT PRIMARY KEY,
          kind TEXT NOT NULL,
          detail TEXT,
          created_at TEXT NOT NULL
        )`,
      ),
    db.prepare(
      "CREATE INDEX IF NOT EXISTS hermes_events_kind_created_idx ON hermes_events(kind, created_at)",
    ),
    db
      .prepare(
        `CREATE TABLE IF NOT EXISTS hermes_snapshots (
          profile TEXT PRIMARY KEY,
          object_key TEXT NOT NULL,
          checksum TEXT NOT NULL,
          byte_length TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )`,
      ),
  ]);
  return db;
}

function timingSafeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return mismatch === 0;
}

export function requestIdentity(request: Request) {
  return request.headers.get("oai-authenticated-user-email")?.trim() || null;
}

export function isLocalRequest(request: Request) {
  const hostname = new URL(request.url).hostname;
  return hostname === "localhost" || hostname === "127.0.0.1";
}

export function isExecutorRequest(request: Request) {
  return hasBearerToken(request, getRuntimeEnv().AGENT_BRIDGE_TOKEN);
}

export function isTunnelRequest(request: Request) {
  return hasBearerToken(request, getRuntimeEnv().HERMES_TUNNEL_TOKEN);
}

function hasBearerToken(request: Request, expectedToken?: string) {
  const expected = expectedToken?.trim();
  if (!expected) return false;
  const authorization = request.headers.get("authorization") ?? "";
  const supplied = authorization.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : "";
  return timingSafeEqual(expected, supplied);
}

export function isAuthorizedRequest(request: Request) {
  return (
    Boolean(requestIdentity(request)) ||
    isExecutorRequest(request) ||
    isTunnelRequest(request) ||
    isLocalRequest(request)
  );
}
