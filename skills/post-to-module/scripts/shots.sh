#!/usr/bin/env bash
# shots.sh —— 给一个模块批量截图（四页签 + 窄屏），供人工看
# 用法：bash shots.sh <id> [base]        例：bash shots.sh cabinet
#      bash shots.sh cabinet "file:///Users/…/dist/index.html"   截构建产物
# 产出：/tmp/shots/<id>/*.png
set -uo pipefail
ID="${1:?用法: bash shots.sh <id> [base]}"
BASE="${2:-http://127.0.0.1:5177/}"
OUT="/tmp/shots/$ID"
mkdir -p "$OUT"

CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
[ -x "$CHROME" ] || { echo "找不到 Chrome：$CHROME"; exit 1; }

shot() { # $1=名字 $2=hash+query $3=宽 $4=高
  local name="$1" frag="$2" w="${3:-1280}" h="${4:-1400}"
  "$CHROME" --headless=new --no-sandbox --disable-gpu --disable-breakpad \
    --disable-crash-reporter --hide-scrollbars --force-device-scale-factor=2 \
    --user-data-dir="$(mktemp -d)" --virtual-time-budget=4000 \
    --window-size="${w},${h}" --screenshot="$OUT/$name.png" \
    "${BASE%/}/#/$ID$frag" >/dev/null 2>&1
  if [ -s "$OUT/$name.png" ]; then
    echo "  ✓ $name.png  $(sips -g pixelWidth -g pixelHeight "$OUT/$name.png" | awk '/pixel/{printf "%s ", $2}')"
  else
    echo "  ✗ $name.png 截图失败"
  fi
}

echo "→ 截 $ID（$BASE）"
shot plan "" 1280 1400
shot cut "?tab=cut" 1280 1200
shot bom "?tab=bom" 1280 1400
shot install "?tab=install" 1280 1500
shot narrow "" 500 1800          # 移动端：Chrome headless 最小可见宽度 500
echo "完成：$OUT"
open "$OUT" 2>/dev/null || true