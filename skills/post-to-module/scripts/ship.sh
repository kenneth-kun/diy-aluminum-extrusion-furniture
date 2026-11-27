#!/usr/bin/env bash
# ship.sh —— 构建 + 提交 + 推 main + 重建 gh-pages 分支
# 用法：bash ship.sh "commit message"     （在项目根目录跑，默认自动 cd 到项目根）
# 前置：git remote 已设成 SSH（HTTPS 会因 keychain 里的 x-access-token 报 403）
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$ROOT"
MSG="${1:-chore: 更新}"
AUTHOR_NAME="kenneth-kun"
AUTHOR_EMAIL="kenneth-kun@users.noreply.github.com"

export PATH="/Users/lilikun/.workbuddy/binaries/node/versions/25.9.0/bin:$PATH"
command -v node >/dev/null || { echo "找不到 node"; exit 1; }
echo "→ node $(node -v)"

echo "→ npm test"
npm test

echo "→ npm run build"
npm run build

echo "→ npm run test:dom"
npm run test:dom || echo "  ! DOM 测试有失败，先看清再决定要不要继续"

echo "→ commit + push main"
git add -A
if git diff --cached --quiet; then
  echo "  没有变更需要提交"
else
  git -c user.name="$AUTHOR_NAME" -c user.email="$AUTHOR_EMAIL" commit -q -m "$MSG" \
    --author="$AUTHOR_NAME <$AUTHOR_EMAIL>"
  git log -1 --oneline
fi
git push -q origin HEAD:main && echo "  ✓ main 已推送"

echo "→ 重建 gh-pages"
rm -rf .deploy && mkdir .deploy
cp -R dist/. .deploy/
(
  cd .deploy
  git init -q
  git checkout -q -b gh-pages
  git add -A
  git -c user.name="$AUTHOR_NAME" -c user.email="$AUTHOR_EMAIL" commit -q -m "$MSG" \
    --author="$AUTHOR_NAME <$AUTHOR_EMAIL>"
  git push -q -f origin HEAD:gh-pages
)
rm -rf .deploy
echo "  ✓ gh-pages 已更新"

REPO="$(git config --get remote.origin.url | sed 's#.*github.com[:/]##; s#\.git$##')"
echo
echo "线上：https://$(echo "$REPO" | sed 's#/#.github.io/#; s#^\([^.]*\)\.github\.io/#\1.github.io/#')/"
echo "提醒：GitHub 仓库 Settings→Pages 必须选 gh-pages 分支（/(root)），否则线上白屏。"