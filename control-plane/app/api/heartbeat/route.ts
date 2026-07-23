import { ensureSchema, isExecutorRequest } from "@/db/runtime";

export async function POST(request: Request) {
  if (!isExecutorRequest(request)) {
    return Response.json({ error: "Executor authentication required." }, { status: 401 });
  }

  const db = await ensureSchema();
  const now = new Date().toISOString();
  await db
    .prepare("INSERT INTO hermes_events (id, kind, detail, created_at) VALUES (?, 'heartbeat', ?, ?)")
    .bind(crypto.randomUUID(), "hosted-work", now)
    .run();
  return Response.json({ ok: true, at: now });
}
