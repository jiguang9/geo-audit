#!/usr/bin/env bash
# Update an installed geo-audit skill to the latest version on GitHub.
# Needs only curl (or wget) and tar, so it also works inside sandboxed shells.
#
# Usage:
#   bash update.sh                          # run the copy inside the skill folder
#   bash update.sh /path/to/skills/geo-audit
#   curl -fsSL https://raw.githubusercontent.com/jiguang9/geo-audit/main/skills/geo-audit/update.sh | bash -s -- /path/to/skills/geo-audit
#
# The skill folder is the one that holds SKILL.md. Only the files geo-audit ships are
# replaced (SKILL.md, LICENSE, update.sh, agents/, evals/, references/, tools/); anything else in
# the folder, such as .agents/ score history, is left alone.

set -euo pipefail

TARBALL="${GEO_AUDIT_TARBALL:-https://github.com/jiguang9/geo-audit/archive/refs/heads/main.tar.gz}"
MANAGED="SKILL.md LICENSE update.sh agents evals references tools"
# Files the pre-2026-10 update.sh copied in from the repo root; harmless but no longer needed
OLD_LEFTOVERS="README.md README.en.md CLAUDE.md AGENTS.md action.yml package.json .gitignore tests skills docs"

if [ $# -ge 1 ]; then
  SKILL_DIR="$1"
elif [ -f "${BASH_SOURCE[0]:-}" ]; then
  SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
else
  echo "Error: pass the skill folder, e.g. bash -s -- ~/.claude/skills/geo-audit" >&2
  exit 1
fi
SKILL_DIR="$(cd "${SKILL_DIR}" && pwd)"

echo "geo-audit update"
echo "  Skill folder: ${SKILL_DIR}"

# A git clone of the whole repo updates itself
if [ -d "${SKILL_DIR}/.git" ]; then
  echo "  Method: git pull"
  git -C "${SKILL_DIR}" pull --ff-only
  echo "Done."
  exit 0
fi

# Refuse to write into a folder that is not a geo-audit install
if ! grep -q '^name: geo-audit' "${SKILL_DIR}/SKILL.md" 2>/dev/null; then
  echo "Error: ${SKILL_DIR}/SKILL.md is not the geo-audit skill; pass the folder that holds it." >&2
  exit 1
fi

TMP="$(mktemp -d)"
trap 'rm -rf "${TMP}"' EXIT

if command -v curl >/dev/null 2>&1; then
  echo "  Method: curl"
  curl -fsSL "${TARBALL}" | tar -xz -C "${TMP}" --strip-components=1
elif command -v wget >/dev/null 2>&1; then
  echo "  Method: wget"
  wget -qO- "${TARBALL}" | tar -xz -C "${TMP}" --strip-components=1
else
  echo "Error: neither curl nor wget is available. Download ${TARBALL}" >&2
  echo "and copy its skills/geo-audit/ folder over ${SKILL_DIR}." >&2
  exit 1
fi

SRC="${TMP}/skills/geo-audit"
if [ ! -f "${SRC}/SKILL.md" ] || [ ! -f "${SRC}/tools/audit.js" ]; then
  echo "Error: the download does not contain skills/geo-audit/ with tools; nothing was changed." >&2
  exit 1
fi

for item in ${MANAGED}; do
  [ -e "${SRC}/${item}" ] || continue
  rm -rf "${SKILL_DIR:?}/${item}"
  cp -R "${SRC}/${item}" "${SKILL_DIR}/"
done
echo "  Replaced: ${MANAGED}"

leftovers=""
for item in ${OLD_LEFTOVERS}; do
  [ -e "${SKILL_DIR}/${item}" ] && leftovers="${leftovers} ${item}"
done
if [ -n "${leftovers}" ]; then
  echo "  Note: these look like leftovers from the old update.sh and can be deleted:${leftovers}"
fi

echo "Done. Start a new agent session so the updated SKILL.md is picked up."
