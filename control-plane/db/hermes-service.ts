import { ensureSchema } from "@/db/runtime";

export type HermesJobStatus = "queued" | "running" | "completed" | "failed";

export type HermesJob = {
  id: string;
  prompt: string;
  status: HermesJobStatus;
  requested_by: string | null;
  created_at: string;
  claimed_at: string | null;
  completed_at: string | null;
  result_summary: string | null;
};

export type HermesMemory = {
  id: string;
  prompt: string;
  status: "completed" | "failed";
  result_summary: string;
  completed_at: string;
};

const MAX_PROMPT_LENGTH = 12_000;
const MAX_RESULT_LENGTH = 12_000;
const CLAIM_LEASE_MS = 2 * 60 * 60 * 1000;

export function normalizePrompt(value: string): string {
  const prompt = value.trim();
  if (!prompt || prompt.length > MAX_PROMPT_LENGTH) {
    throw new Error("Prompt must be between 1 and 12,000 characters.");
  }
  return prompt;
}

export async function listJobs(limit = 20): Promise<HermesJob[]> {
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 50);
  const db = await ensureSchema();
  const jobs = await db
    .prepare(
      `SELECT id, prompt, status, requested_by, created_at, claimed_at, completed_at, result_summary
       FROM hermes_jobs ORDER BY created_at DESC LIMIT ?`,
    )
    .bind(safeLimit)
    .all<HermesJob>();
  return jobs.results ?? [];
}

export async function enqueueJob(
  rawPrompt: string,
  requestedBy: string | null,
): Promise<{ id: string; status: "queued" }> {
  const prompt = normalizePrompt(rawPrompt);
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const db = await ensureSchema();
  await db
    .prepare(
      `INSERT INTO hermes_jobs (id, prompt, status, requested_by, created_at)
       VALUES (?, ?, 'queued', ?, ?)`,
    )
    .bind(id, prompt, requestedBy, now)
    .run();
  await db
    .prepare(
      "INSERT INTO hermes_events (id, kind, detail, created_at) VALUES (?, 'enqueue', ?, ?)",
    )
    .bind(crypto.randomUUID(), id, now)
    .run();
  return { id, status: "queued" };
}

async function recentMemory(limit = 6): Promise<HermesMemory[]> {
  const db = await ensureSchema();
  const rows = await db
    .prepare(
      `SELECT id, prompt, status, result_summary, completed_at
       FROM hermes_jobs
       WHERE status IN ('completed', 'failed')
         AND result_summary IS NOT NULL
         AND completed_at IS NOT NULL
       ORDER BY completed_at DESC
       LIMIT ?`,
    )
    .bind(Math.min(Math.max(Math.trunc(limit), 1), 12))
    .all<HermesMemory>();
  return rows.results ?? [];
}

export async function claimWorkBundle(): Promise<{
  job: Pick<HermesJob, "id" | "prompt" | "created_at"> | null;
  memory: HermesMemory[];
  lease_expires_at: string | null;
}> {
  const db = await ensureSchema();
  const now = new Date();
  const staleBefore = new Date(now.getTime() - CLAIM_LEASE_MS).toISOString();
  const recovered = await db
    .prepare(
      `UPDATE hermes_jobs
       SET status = 'queued', claimed_at = NULL
       WHERE status = 'running' AND claimed_at < ?`,
    )
    .bind(staleBefore)
    .run();
  if (recovered.meta.changes) {
    await db
      .prepare(
        "INSERT INTO hermes_events (id, kind, detail, created_at) VALUES (?, 'lease-recover', ?, ?)",
      )
      .bind(
        crypto.randomUUID(),
        String(recovered.meta.changes),
        now.toISOString(),
      )
      .run();
  }

  const next = await db
    .prepare(
      `SELECT id, prompt, created_at
       FROM hermes_jobs
       WHERE status = 'queued'
       ORDER BY created_at ASC
       LIMIT 1`,
    )
    .first<Pick<HermesJob, "id" | "prompt" | "created_at">>();

  if (!next) {
    return {
      job: null,
      memory: await recentMemory(),
      lease_expires_at: null,
    };
  }

  const claimedAt = new Date().toISOString();
  const claim = await db
    .prepare(
      "UPDATE hermes_jobs SET status = 'running', claimed_at = ? WHERE id = ? AND status = 'queued'",
    )
    .bind(claimedAt, next.id)
    .run();
  if (!claim.meta.changes) {
    return {
      job: null,
      memory: await recentMemory(),
      lease_expires_at: null,
    };
  }

  await db
    .prepare(
      "INSERT INTO hermes_events (id, kind, detail, created_at) VALUES (?, 'claim', ?, ?)",
    )
    .bind(crypto.randomUUID(), next.id, claimedAt)
    .run();
  return {
    job: next,
    memory: await recentMemory(),
    lease_expires_at: new Date(
      Date.parse(claimedAt) + CLAIM_LEASE_MS,
    ).toISOString(),
  };
}

export async function finishJob(
  id: string,
  status: "completed" | "failed",
  rawResult: string,
): Promise<{ id: string; status: "completed" | "failed"; changed: boolean }> {
  const jobId = id.trim();
  if (!jobId) throw new Error("A job id is required.");
  const result = rawResult.trim().slice(0, MAX_RESULT_LENGTH);
  if (!result) throw new Error("A non-empty result summary is required.");

  const db = await ensureSchema();
  const now = new Date().toISOString();
  const update = await db
    .prepare(
      `UPDATE hermes_jobs
       SET status = ?, completed_at = ?, result_summary = ?
       WHERE id = ? AND status = 'running'`,
    )
    .bind(status, now, result, jobId)
    .run();
  const changed = Boolean(update.meta.changes);
  if (changed) {
    await db
      .prepare(
        "INSERT INTO hermes_events (id, kind, detail, created_at) VALUES (?, ?, ?, ?)",
      )
      .bind(crypto.randomUUID(), status, jobId, now)
      .run();
  }
  return { id: jobId, status, changed };
}
