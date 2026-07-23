import { index, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const hermesJobs = sqliteTable(
  "hermes_jobs",
  {
    id: text("id").primaryKey(),
    prompt: text("prompt").notNull(),
    status: text("status").notNull().default("queued"),
    requestedBy: text("requested_by"),
    createdAt: text("created_at").notNull(),
    claimedAt: text("claimed_at"),
    completedAt: text("completed_at"),
    resultSummary: text("result_summary"),
  },
  (table) => [index("hermes_jobs_status_created_idx").on(table.status, table.createdAt)],
);

export const hermesEvents = sqliteTable(
  "hermes_events",
  {
    id: text("id").primaryKey(),
    kind: text("kind").notNull(),
    detail: text("detail"),
    createdAt: text("created_at").notNull(),
  },
  (table) => [index("hermes_events_kind_created_idx").on(table.kind, table.createdAt)],
);

export const hermesSnapshots = sqliteTable("hermes_snapshots", {
  profile: text("profile").primaryKey(),
  objectKey: text("object_key").notNull(),
  checksum: text("checksum").notNull(),
  byteLength: text("byte_length").notNull(),
  updatedAt: text("updated_at").notNull(),
});
