#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
plugin_creator_root="/mnt/c/Users/apexw/.codex/skills/.system/plugin-creator"
skill_creator_root="/mnt/c/Users/apexw/.codex/skills/.system/skill-creator"
node_runtime_bin="/home/aiwithapex/.nvm/versions/node/v24.14.0/bin"
personal_tmp="$(mktemp -d)"

if [[ -d "$node_runtime_bin" ]]; then
  export PATH="$node_runtime_bin:$PATH"
fi

cleanup() {
  local resolved
  resolved="$(realpath "$personal_tmp")"
  case "$resolved" in
    /tmp/tmp.*) rm -rf -- "$resolved" ;;
    *)
      echo "Refusing to remove unexpected temporary path: $resolved" >&2
      return 1
      ;;
  esac
}
trap cleanup EXIT

cd "$repo_root"

python3 "$plugin_creator_root/scripts/validate_plugin.py" plugin
python3 "$skill_creator_root/scripts/quick_validate.py" \
  plugin/skills/run-hermes-hibernation

mkdir "$personal_tmp/run-hermes-hibernation"
cp artifacts/run-hermes-hibernation-personal-SKILL.md \
  "$personal_tmp/run-hermes-hibernation/SKILL.md"
python3 "$skill_creator_root/scripts/quick_validate.py" \
  "$personal_tmp/run-hermes-hibernation"

node --check ops/tunnel-client/hermes-mcp-gateway.cjs
bash -n scripts/*.sh

if command -v shellcheck >/dev/null 2>&1; then
  shellcheck scripts/*.sh
else
  echo "shellcheck: unavailable"
fi

if [[ -x hermes-agent/.venv/bin/python ]]; then
  PYTHONPATH=hermes-agent \
    hermes-agent/.venv/bin/python \
    plugin/skills/run-hermes-hibernation/scripts/verify_toolless.py
else
  PYTHONPATH=hermes-agent \
    python3 \
    plugin/skills/run-hermes-hibernation/scripts/verify_toolless.py
fi

git -C control-plane fsck --no-progress
git -C hermes-agent fsck --no-progress

unzip -t artifacts/hermes-hibernation-plugin-v0.3.0.zip
unzip -t artifacts/run-hermes-hibernation-skill-v0.3.0.zip
tar -tzf artifacts/hermes-control-plane-site-v4.tar.gz >/dev/null

(
  cd control-plane
  npm run lint
  npm test
)

echo "Hermes closeout validation passed."
