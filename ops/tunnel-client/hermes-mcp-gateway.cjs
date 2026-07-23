"use strict";

const { readFileSync } = require("node:fs");
const { createServer: createHttpServer } = require("node:http");
const { McpServer } = require("@modelcontextprotocol/sdk/server/mcp.js");
const {
  WebStandardStreamableHTTPServerTransport,
} = require("@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js");
const z = require("zod/v4");

const listenHost = process.env.HERMES_GATEWAY_HOST || "127.0.0.1";
const listenPort = Number(process.env.HERMES_GATEWAY_PORT || "18081");
const upstreamUrl =
  process.env.HERMES_SITE_MCP_URL ||
  "https://hermes-hibernation-lab.maxgibson.chatgpt.site/api/mcp";
const siteAuthorizationFile =
  process.env.HERMES_SITE_AUTHORIZATION_FILE ||
  "/home/aiwithapex/.config/hermes-tunnel/site-authorization-header";
const mcpAuthorizationFile =
  process.env.HERMES_MCP_AUTHORIZATION_FILE ||
  "/home/aiwithapex/.config/hermes-tunnel/mcp-authorization-header";

function readSecret(path) {
  const value = readFileSync(path, "utf8").trim();
  if (!value) throw new Error(`Required authorization file is empty: ${path}`);
  return value;
}

const siteAuthorization = readSecret(siteAuthorizationFile);
const mcpAuthorization = readSecret(mcpAuthorizationFile);

async function forwardTool(name, args) {
  const response = await fetch(upstreamUrl, {
    method: "POST",
    headers: {
      Accept: "application/json, text/event-stream",
      Authorization: mcpAuthorization,
      "Content-Type": "application/json",
      "OAI-Sites-Authorization": siteAuthorization,
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: `gateway-${crypto.randomUUID()}`,
      method: "tools/call",
      params: { name, arguments: args },
    }),
    signal: AbortSignal.timeout(30_000),
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Hermes Site returned HTTP ${response.status}.`);
  }

  const payload = JSON.parse(text);
  if (payload.error) {
    throw new Error(
      payload.error.message || "Hermes Site rejected the tool call.",
    );
  }
  if (!payload.result) {
    throw new Error("Hermes Site returned an unexpected MCP response.");
  }
  return payload.result;
}

function createMcpServer() {
  const server = new McpServer(
    {
      name: "hermes-hibernation-tunnel-gateway",
      version: "0.1.0",
    },
    {
      instructions:
        "This private gateway exposes a durable Hermes research queue stored on the owner-only Hermes Site. Claim at most one job, run Hermes in the Work sandbox, then commit a concise result before claiming another job.",
    },
  );

  server.registerTool(
    "hermes_get_queue",
    {
      title: "Get Hermes Queue",
      description:
        "List the latest Hermes research jobs and their durable states. This is read-only.",
      inputSchema: {
        limit: z.number().int().min(1).max(50).default(20),
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
    (args) => forwardTool("hermes_get_queue", args),
  );

  server.registerTool(
    "hermes_enqueue_research",
    {
      title: "Enqueue Hermes Research",
      description:
        "Create one durable Hermes research job without credentials or secrets.",
      inputSchema: {
        prompt: z.string().min(1).max(12_000),
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
    (args) => forwardTool("hermes_enqueue_research", args),
  );

  server.registerTool(
    "hermes_claim_research_run",
    {
      title: "Claim Next Hermes Run",
      description:
        "Atomically claim the oldest queued research job for a two-hour lease and return compact durable memory.",
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
        lease_expires_at: z.string().nullable(),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    (args) => forwardTool("hermes_claim_research_run", args),
  );

  server.registerTool(
    "hermes_commit_research_run",
    {
      title: "Commit Hermes Research Run",
      description:
        "Finish a running Hermes job and persist a concise result as durable agent memory.",
      inputSchema: {
        id: z.string().min(1).max(100),
        status: z.enum(["completed", "failed"]),
        result: z.string().min(1).max(12_000),
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
    (args) => forwardTool("hermes_commit_research_run", args),
  );

  return server;
}

async function toWebRequest(request, body) {
  const headers = new Headers();
  for (const [name, value] of Object.entries(request.headers)) {
    if (Array.isArray(value)) {
      for (const item of value) headers.append(name, item);
    } else if (value !== undefined) {
      headers.set(name, value);
    }
  }

  const method = request.method || "GET";
  const url = new URL(request.url || "/", `http://${request.headers.host}`);
  const init = { method, headers };
  if (method !== "GET" && method !== "HEAD") init.body = body;
  return new Request(url, init);
}

function sendWebResponse(response, nodeResponse) {
  nodeResponse.statusCode = response.status;
  for (const [name, value] of response.headers) {
    if (name !== "transfer-encoding") nodeResponse.setHeader(name, value);
  }
  response
    .arrayBuffer()
    .then((body) => nodeResponse.end(Buffer.from(body)))
    .catch((error) => {
      console.error("gateway-response-error", error.message);
      nodeResponse.destroy(error);
    });
}

const httpServer = createHttpServer((request, response) => {
  if (request.method === "GET" && request.url === "/healthz") {
    response.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("live\n");
    return;
  }
  if (request.url !== "/mcp") {
    response.writeHead(404, { "Content-Type": "application/json" });
    response.end('{"error":"Not found."}\n');
    return;
  }

  const chunks = [];
  request.on("data", (chunk) => chunks.push(chunk));
  request.on("end", async () => {
    try {
      const transport = new WebStandardStreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
        enableJsonResponse: true,
      });
      const server = createMcpServer();
      await server.connect(transport);
      const webRequest = await toWebRequest(request, Buffer.concat(chunks));
      const webResponse = await transport.handleRequest(webRequest);
      sendWebResponse(webResponse, response);
    } catch (error) {
      console.error("gateway-request-error", error.message);
      if (!response.headersSent) {
        response.writeHead(500, { "Content-Type": "application/json" });
        response.end('{"error":"Hermes gateway request failed."}\n');
      } else {
        response.destroy(error);
      }
    }
  });
});

httpServer.listen(listenPort, listenHost, () => {
  console.log(`Hermes MCP gateway listening on ${listenHost}:${listenPort}`);
});

function shutdown() {
  httpServer.close(() => process.exit(0));
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
