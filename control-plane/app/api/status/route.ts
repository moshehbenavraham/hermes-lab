import { ensureSchema } from "@/db/runtime";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = await ensureSchema();
    const [counts, heartbeat] = await db.batch([
      db.prepare(
        `SELECT
          SUM(CASE WHEN status = 'queued' THEN 1 ELSE 0 END) AS queued,
          SUM(CASE WHEN status = 'running' THEN 1 ELSE 0 END) AS running,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed
        FROM hermes_jobs`,
      ),
      db
        .prepare(
          "SELECT created_at FROM hermes_events WHERE kind = 'heartbeat' ORDER BY created_at DESC LIMIT 1",
        ),
    ]);

    const countRow = (counts.results?.[0] ?? {}) as Record<string, number | null>;
    const heartbeatRow = (heartbeat.results?.[0] ?? {}) as Record<string, string | null>;
    return Response.json({
      queued: Number(countRow.queued ?? 0),
      running: Number(countRow.running ?? 0),
      completed: Number(countRow.completed ?? 0),
      latestHeartbeat: heartbeatRow.created_at ?? null,
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Status unavailable." },
      { status: 503 },
    );
  }
}
