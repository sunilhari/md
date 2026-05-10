#!/usr/bin/env bash
# Installs the mdx-term PostToolUse hook into ~/.claude/settings.json
# Run once: bash cli/install-hook.sh

set -euo pipefail

SETTINGS="$HOME/.claude/settings.json"
HOOK_SCRIPT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/mdx-hook.sh"

if [[ ! -f "$HOOK_SCRIPT" ]]; then
  echo "Error: hook script not found at $HOOK_SCRIPT" >&2
  exit 1
fi

# Ensure the settings file exists
mkdir -p "$(dirname "$SETTINGS")"
if [[ ! -f "$SETTINGS" ]]; then
  echo '{}' > "$SETTINGS"
fi

# Use python3 to merge the hook entry (avoids jq dependency)
python3 - "$SETTINGS" "$HOOK_SCRIPT" <<'PYEOF'
import sys, json

settings_path = sys.argv[1]
hook_path     = sys.argv[2]

with open(settings_path) as f:
    settings = json.load(f)

settings.setdefault("hooks", {})
settings["hooks"].setdefault("PostToolUse", [])

new_entry = {
    "matcher": "Write",
    "hooks": [
        {
            "type": "command",
            "command": hook_path
        }
    ]
}

# Remove any existing mdx-hook entry to avoid duplicates
settings["hooks"]["PostToolUse"] = [
    e for e in settings["hooks"]["PostToolUse"]
    if not any("mdx-hook" in str(h.get("command", "")) for h in e.get("hooks", []))
]

settings["hooks"]["PostToolUse"].append(new_entry)

with open(settings_path, "w") as f:
    json.dump(settings, f, indent=2)

print(f"✓ Hook installed in {settings_path}")
print(f"  Fires when Claude Code writes any .mdx file → renders via mdx-term in terminal")
PYEOF
