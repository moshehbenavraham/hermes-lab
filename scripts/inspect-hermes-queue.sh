#!/usr/bin/env bash
set -euo pipefail

site_authorization_file="${1:-/home/aiwithapex/.config/hermes-tunnel/site-authorization-header}"
mcp_authorization_file="${2:-/home/aiwithapex/.config/hermes-tunnel/mcp-authorization-header}"
site_mcp_url="https://hermes-hibernation-lab.maxgibson.chatgpt.site/api/mcp"

if [[ ! -r "$site_authorization_file" || ! -r "$mcp_authorization_file" ]]; then
  echo "A required authorization header file is not readable." >&2
  exit 1
fi

site_authorization="$(tr -d '\r\n' <"$site_authorization_file")"
mcp_authorization="$(tr -d '\r\n' <"$mcp_authorization_file")"

response="$(
  curl --silent --show-error --fail-with-body \
    --header "Accept: application/json, text/event-stream" \
    --header "Content-Type: application/json" \
    --header "Authorization: ${mcp_authorization}" \
    --header "OAI-Sites-Authorization: ${site_authorization}" \
    --data '{"jsonrpc":"2.0","id":"queue-inspection","method":"tools/call","params":{"name":"hermes_get_queue","arguments":{"limit":20}}}' \
    "$site_mcp_url"
)"

node -e '
  const payload = JSON.parse(process.argv[1]);
  if (payload.error) {
    throw new Error(payload.error.message ?? "Hermes queue inspection failed.");
  }
  const jobs = payload.result?.structuredContent?.jobs;
  if (!Array.isArray(jobs)) {
    throw new Error("Hermes returned an unexpected queue payload.");
  }
  process.stdout.write(`${JSON.stringify({ jobs }, null, 2)}\n`);
' "$response"
