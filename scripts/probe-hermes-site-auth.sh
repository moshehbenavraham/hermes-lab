#!/usr/bin/env bash
set -euo pipefail

authorization_file="${1:-/home/aiwithapex/.config/hermes-tunnel/site-authorization-header}"
application_authorization_file="${2:-/home/aiwithapex/.config/hermes-tunnel/mcp-authorization-header}"
site_origin="https://hermes-hibernation-lab.maxgibson.chatgpt.site"

if [[ ! -r "$authorization_file" || ! -r "$application_authorization_file" ]]; then
  echo "A required authorization header file is not readable." >&2
  exit 1
fi

authorization_value="$(tr -d '\r\n' <"$authorization_file")"
application_authorization_value="$(tr -d '\r\n' <"$application_authorization_file")"

probe() {
  local label="$1"
  local url="$2"
  local expected="$3"
  local status

  status="$(
    curl --silent --show-error --output /dev/null --write-out '%{http_code}' \
      --header "Authorization: ${application_authorization_value}" \
      --header "OAI-Sites-Authorization: ${authorization_value}" \
      "$url"
  )"
  printf '%s: HTTP %s\n' "$label" "$status"
  [[ "$status" == "$expected" ]]
}

probe_without_headers() {
  local label="$1"
  local url="$2"
  local expected="$3"
  local status

  status="$(
    curl --silent --show-error --output /dev/null --write-out '%{http_code}' \
      "$url"
  )"
  printf '%s: HTTP %s\n' "$label" "$status"
  [[ "$status" == "$expected" ]]
}

probe "Authorized MCP GET reaches application route" \
  "${site_origin}/api/mcp" \
  "406"
probe "Authorized protected-resource metadata is absent" \
  "${site_origin}/.well-known/oauth-protected-resource/api/mcp" \
  "404"
probe_without_headers "Unauthenticated MCP remains denied" \
  "${site_origin}/api/mcp" \
  "401"
