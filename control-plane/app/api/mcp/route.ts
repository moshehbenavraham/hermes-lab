import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import * as z from "zod/v4";

import {
  claimWorkBundle,
  enqueueJob,
  finishJob,
  listJobs,
} from "@/db/hermes-service";
import { isAuthorizedRequest, requestIdentity } from "@/db/runtime";

export const dynamic = "force-dynamic";

const toolResult = <T extends Record<string, unknown>>(value: T) => ({
  content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }],
  structuredContent: value,
});

const toolError = (error: unknown) => ({
  isError: true,
  content: [
    {
      type: "text" as const,
      text:
        error instanceof Error
          ? error.message
          : "The Hermes control plane could not complete this operation.",
    },
  ],
});

function createServer(request: Request) {
  const server = new McpServer(
    {
      name: "hermes-hibernation-mcp-server",
      version: "0.1.0",
    },
    {
      instructions:
        "This private control plane persists research jobs and compact memory between ephemeral Work runs. Claim at most one job, run Hermes in the Work sandbox, then commit a concise result before claiming another job.",
    },
  );

  server.registerTool(
    "hermes_get_queue",
    {
      title: "Get Hermes Queue",
      description:
        "List the latest Hermes research jobs and their durable states. This is read-only. Use it to inspect queued, running, completed, and failed work before deciding what to do next.",
      inputSchema: {
        limit: z
          .number()
          .int()
          .min(1)
          .max(50)
          .default(20)
          .describe("Maximum number of recent jobs to return, from 1 to 50."),
      },
      outputSchema: {
        jobs: z.array(z.record(z.string(), z.unknown())),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ limit }) => {
      try {
        return toolResult({ jobs: await listJobs(limit) });
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "hermes_enqueue_research",
    {
      title: "Enqueue Hermes Research",
      description:
        "Create one durable Hermes research job. Use this when the user asks the hosted agent to investigate a concrete question. The prompt must contain the research objective and expected output, and must not contain credentials or secrets.",
      inputSchema: {
        prompt: z
          .string()
          .min(1)
          .max(12_000)
          .describe("Research objective and expected output, without secrets."),
      },
      outputSchema: {
        id: z.string(),
        status: z.literal("queued"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async ({ prompt }) => {
      try {
        return toolResult(
          await enqueueJob(prompt, requestIdentity(request) ?? "chatgpt-plugin"),
        );
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "hermes_claim_research_run",
    {
      title: "Claim Next Hermes Run",
      description:
        "Atomically claim the oldest queued research job for a two-hour lease and return it with compact memory from recent completed runs. Call this once at the start of a scheduled Work execution. If job is null, stop without running Hermes. Expired leases are recovered automatically.",
      inputSchema: {},
      outputSchema: {
        job: z
          .object({
            id: z.string(),
            prompt: z.string(),
            created_at: z.string(),
          })
          .nullable(),
        memory: z.array(z.record(z.string(), z.unknown())),
        lease_expires_at: z
          .string()
          .nullable()
          .describe(
            "ISO timestamp when the claimed job becomes recoverable after an interrupted run.",
          ),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async () => {
      try {
        return toolResult(await claimWorkBundle());
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "hermes_commit_research_run",
    {
      title: "Commit Hermes Research Run",
      description:
        "Finish a running Hermes job and persist a concise result as durable agent memory. Use status completed for a useful research result or failed with an actionable explanation. Repeating an already committed job does not create another state transition.",
      inputSchema: {
        id: z.string().min(1).max(100).describe("Claimed Hermes job id."),
        status: z
          .enum(["completed", "failed"])
          .describe("Final durable state for the claimed job."),
        result: z
          .string()
          .min(1)
          .max(12_000)
          .describe("Concise result or actionable failure summary, without secrets."),
      },
      outputSchema: {
        id: z.string(),
        status: z.enum(["completed", "failed"]),
        changed: z.boolean(),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ id, status, result }) => {
      try {
        return toolResult(await finishJob(id, status, result));
      } catch (error) {
        return toolError(error);
      }
    },
  );

  return server;
}

async function handle(request: Request): Promise<Response> {
  if (!isAuthorizedRequest(request)) {
    return Response.json({ error: "Authentication required." }, { status: 401 });
  }

  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  const server = createServer(request);
  await server.connect(transport);
  return transport.handleRequest(request);
}

export async function POST(request: Request): Promise<Response> {
  return handle(request);
}

export async function GET(request: Request): Promise<Response> {
  return handle(request);
}

export async function DELETE(request: Request): Promise<Response> {
  return handle(request);
}
