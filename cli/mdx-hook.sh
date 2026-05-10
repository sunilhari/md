#!/usr/bin/env bash
# PostToolUse hook — auto-renders .mdx files the moment Claude writes them.
#
# Claude Code feeds JSON to stdin:
#   { "tool_name": "Write", "tool_input": { "file_path": "...", ... } }
#
# Install once: bash cli/install-hook.sh
# Manual test:  echo '{"tool_input":{"file_path":"test.mdx"}}' | bash cli/mdx-hook.sh

set -euo pipefail

# ── 1. Extract file path from stdin ─────────────────────────────────────────
FILE_PATH=$(python3 -c "
import sys, json
print(json.load(sys.stdin).get('tool_input', {}).get('file_path', ''))
")

# ── 2. Only act on .mdx files ────────────────────────────────────────────────
[[ "$FILE_PATH" == *.mdx ]] || exit 0

# ── 3. Find mdx-term ─────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MDX_TERM="node $SCRIPT_DIR/mdx-term.mjs"

# ── 4. Render ─────────────────────────────────────────────────────────────────
if [[ -n "${TMUX:-}" ]]; then
  # Inside tmux: open a new window so the render doesn't mix with Claude's output.
  # The window closes when you press Enter.
  tmux new-window -n "mdx" \
    "clear; $MDX_TERM \"$FILE_PATH\"; echo; read -rp $'\e[2m  press enter to close\e[0m '"
else
  # Not in tmux: print directly to stdout.
  # Claude Code surfaces hook output in the terminal below its own session.
  echo ""
  $MDX_TERM "$FILE_PATH"
fi
