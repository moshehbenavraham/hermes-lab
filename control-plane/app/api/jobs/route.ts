import {
  isAuthorizedRequest,
  isExecutorRequest,
  requestIdentity,
} from "@/db/runtime";
import {
  claimWorkBundle,
  enqueueJob,
  finishJob,
  listJobs,
} from "@/db/hermes-service";

export const dynamic = "force-dynamic";

function unauthorized() {
  return Response.json({ error: "Authentication required." }, { status: 401 });
}

export async function GET(request: Request) {
  if (!isAuthorizedRequest(request)) return unauthorized();
  return Response.json({ jobs: await listJobs(50) });
}

export async function POST(request: Request) {
  if (!isAuthorizedRequest(request)) return unauthorized();

  const payload = (await request.json()) as {
    action?: "enqueue" | "claim" | "complete" | "fail";
    prompt?: string;
    id?: string;
    result?: string;
  };
  const action = payload.action ?? "enqueue";

  if (action === "enqueue") {
    try {
      const result = await enqueueJob(payload.prompt ?? "", requestIdentity(request));
      return Response.json(result, { status: 201 });
    } catch (error) {
      return Response.json(
        { error: error instanceof Error ? error.message : "Invalid prompt." },
        { status: 400 },
      );
    }
  }

  if (!isExecutorRequest(request)) return unauthorized();

  if (action === "claim") {
    return Response.json(await claimWorkBundle());
  }

  if ((action === "complete" || action === "fail") && payload.id) {
    const status = action === "complete" ? "completed" : "failed";
    try {
      return Response.json(
        await finishJob(payload.id, status, payload.result ?? ""),
      );
    } catch (error) {
      return Response.json(
        { error: error instanceof Error ? error.message : "Invalid result." },
        { status: 400 },
      );
    }
  }

  return Response.json({ error: "Unsupported job action." }, { status: 400 });
}
