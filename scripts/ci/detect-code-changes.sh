#!/usr/bin/env bash
# ci.yml `changes` job（AU-015）：成條 branch 有冇 code 改動？結果寫入 $GITHUB_OUTPUT（`code=true|false`）。
#
#   GITHUB_SHA=<sha> GITHUB_OUTPUT=<file> bash scripts/ci/detect-code-changes.sh
#
# - 比較對象係「同 origin/main 嘅 merge-base → GITHUB_SHA」，唔係今次 push 嘅 delta：
#   push A（code，CI 紅）之後 push B（淨 docs）仍然係 code=true，head 唔會靠跳過變綠
# - `--no-renames`：`git mv src/a.ts docs/a.md` 會列出 src/a.ts（刪除），唔會當 docs-only
# - 判斷唔到（冇 origin/main、冇 merge-base、diff 失敗、diff 係空）一律 code=true，照跑全套
# - path 有特別字元時 git 會用引號包住（core.quotePath），match 唔到 docs pattern → 當 code（安全嗰邊）
# 要 full history（checkout fetch-depth: 0）。Test：scripts/ci/detect-code-changes.test.mjs
set -euo pipefail

readonly BASE_REF='origin/main'
readonly DOCS_ONLY_PATTERN='^(\.proj-docs/|\.tickets/|\.claude/|docs/|LICENSE)|\.md$'
readonly EXIT_USAGE=2

if [[ -z "${GITHUB_SHA:-}" || -z "${GITHUB_OUTPUT:-}" ]]; then
    echo 'detect-code-changes: GITHUB_SHA and GITHUB_OUTPUT must be set' >&2
    exit "$EXIT_USAGE"
fi

base="$(git merge-base "$BASE_REF" "$GITHUB_SHA" 2>/dev/null || true)"
code=true
if [[ -n "$base" ]]; then
    changed="$(git diff --name-only --no-renames "$base" "$GITHUB_SHA" || true)"
    if [[ -n "$changed" ]] && ! grep -qvE "$DOCS_ONLY_PATTERN" <<<"$changed"; then
        code=false
    fi
fi

echo "base=${base:-none} code=$code"
echo "code=$code" >> "$GITHUB_OUTPUT"
