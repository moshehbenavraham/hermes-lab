#!/usr/bin/env bash
set -euo pipefail

gateway_url="${1:-http://127.0.0.1:18081/mcp}"

call_mcp() {
  curl --silent --show-error --fail-with-body \
    --header "Accept: application/json, text/event-stream" \
    --header "Content-Type: application/json" \
    --data "$1" \
    "$gateway_url"
}

initialize_response="$(
  call_mcp '{"jsonrpc":"2.0","id":"initialize-probe","method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"hermes-gateway-probe","version":"1.0.0"}}}'
)"
tools_response="$(
  call_mcp '{"jsonrpc":"2.0","id":"tools-probe","method":"tools/list","params":{}}'
)"
queue_response="$(
  call_mcp '{"jsonrpc":"2.0","id":"queue-probe","method":"tools/call","params":{"name":"hermes_get_queue","arguments":{"limit":5}}}'
)"

node -e '
  const initialize = JSON.parse(process.argv[1]);
  const tools = JSON.parse(process.argv[2]);
  const queue = JSON.parse(process.argv[3]);
  for (const payload of [initialize, tools, queue]) {
    if (payload.error) throw new Error(payload.error.message);
  }
  const names = tools.result?.tools?.map((tool) => tool.name);
  const jobs = queue.result?.structuredContent?.jobs;
  if (!Array.isArray(names) || !Array.isArray(jobs)) {
    throw new Error("Hermes gateway returned an unexpected payload.");
  }
  process.stdout.write(`${JSON.stringify({
    server: initialize.result?.serverInfo?.name,
    tools: names,
    queue_size: jobs.length,
  }, null, 2)}\n`);
' "$initialize_response" "$tools_response" "$queue_response"
