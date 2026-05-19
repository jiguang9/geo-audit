#!/usr/bin/env bash
# Update geo-audit skill to the latest version from GitHub.
# Run this script from inside the skill directory, or pass the install path as $1.
#
# Usage:
#   bash update.sh                          # auto-detects skill directory
#   bash update.sh ~/.codex/skills/geo-audit

set -e

SKILL_DIR="${1:-$(dirname "$0")}"
REPO="https://github.com/jiguang9/geo-audit"

echo "Updating geo-audit from ${REPO}..."

if [ -d "${SKILL_DIR}/.git" ]; then
  # Installed as a git clone — just pull
  git -C "${SKILL_DIR}" pull --ff-only
else
  # Installed as a plain folder (npx skills add) — re-download via npx
  npx --yes skills add "${REPO}" --skill geo-audit
fi

echo "geo-audit updated successfully."
