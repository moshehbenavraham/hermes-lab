import {
  ensureSchema,
  getStateBucket,
  isExecutorRequest,
} from "@/db/runtime";

function unauthorized() {
  return Response.json({ error: "Executor authentication required." }, { status: 401 });
}

function profileFrom(request: Request) {
  const value = request.headers.get("x-hermes-profile")?.trim() || "default";
  return /^[a-z0-9][a-z0-9-]{0,62}$/.test(value) ? value : null;
}

export async function GET(request: Request) {
  if (!isExecutorRequest(request)) return unauthorized();
  const profile = profileFrom(request);
  if (!profile) return Response.json({ error: "Invalid profile." }, { status: 400 });

  const object = await getStateBucket().get(`snapshots/${profile}/latest.enc`);
  if (!object) return new Response(null, { status: 404 });
  return new Response(object.body, {
    headers: {
      "content-type": "application/octet-stream",
      etag: object.httpEtag,
      "x-hermes-encrypted": "aes-256-gcm",
    },
  });
}

export async function PUT(request: Request) {
  if (!isExecutorRequest(request)) return unauthorized();
  const profile = profileFrom(request);
  if (!profile) return Response.json({ error: "Invalid profile." }, { status: 400 });
  if (request.headers.get("x-hermes-encrypted") !== "aes-256-gcm") {
    return Response.json(
      { error: "Plaintext snapshots are refused; encrypt with AES-256-GCM first." },
      { status: 415 },
    );
  }

  const bytes = await request.arrayBuffer();
  if (!bytes.byteLength || bytes.byteLength > 50 * 1024 * 1024) {
    return Response.json(
      { error: "Snapshot must be between 1 byte and 50 MiB." },
      { status: 413 },
    );
  }

  const checksumBuffer = await crypto.subtle.digest("SHA-256", bytes);
  const checksum = Array.from(new Uint8Array(checksumBuffer), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  const key = `snapshots/${profile}/latest.enc`;
  const now = new Date().toISOString();

  await getStateBucket().put(key, bytes, {
    httpMetadata: { contentType: "application/octet-stream" },
    customMetadata: { checksum, encrypted: "aes-256-gcm" },
  });
  const db = await ensureSchema();
  await db
    .prepare(
      `INSERT INTO hermes_snapshots (profile, object_key, checksum, byte_length, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(profile) DO UPDATE SET
         object_key = excluded.object_key,
         checksum = excluded.checksum,
         byte_length = excluded.byte_length,
         updated_at = excluded.updated_at`,
    )
    .bind(profile, key, checksum, String(bytes.byteLength), now)
    .run();
  return Response.json({ profile, checksum, byteLength: bytes.byteLength, updatedAt: now });
}
