#!/usr/bin/env bash
# run-dom-tests.sh —— 构建产物的 DOM 冒烟测试
# 用 headless Chrome 打开 dist/index.html（file:// 协议，等于验证「双击就能用」），
# 逐条 grep 关键文字。用法：bash tests/run-dom-tests.sh
#
# 依赖：macOS 上的 Google Chrome；如装在别处，用 CHROME 环境变量覆盖。

set -uo pipefail
cd "$(dirname "$0")/.." || exit 1
ROOT="$(pwd)"
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
ENTRY="file://$ROOT/dist/index.html"

if [ ! -f "$ROOT/dist/index.html" ]; then
  echo "先跑 npm run build（dist/index.html 不存在）"; exit 1
fi
if [ ! -x "$CHROME" ]; then
  echo "找不到 Chrome：$CHROME"; exit 1
fi

pass=0; fail=0; fails=()
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT

# dump <路由+参数> —— 把渲染后的 DOM 存到 $TMP/last.html，返回纯文本（去掉 script、标签）
dump() {
  local prof; prof="$(mktemp -d)"
  "$CHROME" --headless=new --no-sandbox --disable-gpu --disable-breakpad --disable-crash-reporter \
    --hide-scrollbars --user-data-dir="$prof" --virtual-time-budget=4000 --window-size=1280,1000 \
    --dump-dom "$ENTRY$1" > "$TMP/last.html" 2>/dev/null
  rm -rf "$prof"
  python3 - "$TMP/last.html" "$TMP/last.txt" <<'PY'
import html, re, sys
s = open(sys.argv[1], encoding="utf-8", errors="replace").read()
s = re.sub(r"<script[\s\S]*?</script>", "", s)
t = html.unescape(re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", s)))
open(sys.argv[2], "w", encoding="utf-8").write(t)
PY
  cp "$TMP/last.txt" "$TMP/prev.txt"
}

has() { # has <描述> <子串...>（全部命中才算过）
  local name="$1"; shift
  local s; s="$(cat "$TMP/prev.txt")"
  for needle in "$@"; do
    if ! printf '%s' "$s" | grep -Fq -- "$needle"; then
      fail=$((fail+1)); fails+=("$name ¶ 缺：$needle"); echo "  ✗ $name ¶ 缺：$needle"; return
    fi
  done
  pass=$((pass+1)); echo "  ✓ $name"
}
hasnt() { # hasnt <描述> <不应出现的子串>
  local name="$1"; local s; s="$(cat "$TMP/prev.txt")"
  if printf '%s' "$s" | grep -Fq -- "$2"; then
    fail=$((fail+1)); fails+=("$name ¶ 不该出现：$2"); echo "  ✗ $name ¶ 不该出现：$2"
  else pass=$((pass+1)); echo "  ✓ $name"
  fi
}

echo "== 1. 首页（#/）"
dump "#/"
has "四套方案都在" "四套" "免打孔" "尺寸算法"
has "四套价格都在" "¥1153" "¥1217" "¥303" "¥711"
has "搜索框与条目数" "项"
has "资料索引含说明书" "亚克力展示盒.md"
has "页脚许可" "MIT"

echo "== 2. 展示架（#/shelf）"
dump "#/shelf"
has "默认 7 层 / 每层 10 台" "7 层" "10 台 / 层"
has "外廓 580×280×517" "580×280×517"
has "解释文案可读" "÷ 层距"
has "层数 chips 可点" "换成别的层数看看"
dump "#/shelf?tab=install"
has "装配页有步骤" "步" "工具"
hasnt "装配页没有技术错误" "undefined"

echo "== 3. 抽屉柜（#/cabinet）"
dump "#/cabinet"
has "默认 4 抽 / 净高 155" "4 抽" "155 mm"
has "内空 390×340×640" "390×340×640"
has "总价 ¥1217" "¥1217"
dump "#/cabinet?tab=cut"
has "型材总长 14.06 m" "14.06 m"
has "端盖 56 个" "端盖：56 个"
has "卡扣端盖免攻丝" "两端不攻丝"
has "板材面积 1.91 ㎡" "1.91 ㎡"
dump "#/cabinet?capFix=tap&tab=cut"
has "攻丝版端面话术" "端面攻 M4 螺纹（共 56 孔）"
has "攻丝版端面话术后跟端盖明细" "端盖：56 个" "M4"
dump "#/cabinet?capFix=tap&tab=bom"
has "攻丝版多一行攻丝费" "端面攻丝（M4）" "¥67"
has "采购页有比价链接" "1688" "淘宝" "京东"

echo "== 4. 桌面柜（#/tray）"
dump "#/tray"
has "默认 3 层外廓" "455×355" "475 mm"
has "总价 ¥303" "¥303"
has "切料总长 6.46 m" "6.46 m"
has "配色色卡" "第 1 层 · 砖红" "第 3 层 · 藏蓝"
dump "#/tray?n=5&tab=cut"
has "5 层参数生效" "5 层 × 层距"
has "5 层切料变长" " m"

echo "== 5. 展示盒（#/display）"
dump "#/display"
has "默认外廓 310×260 / 814" "310×260" "814 mm"
has "门板 298×246" "298×246"
has "总价 ¥711" "¥711"
dump "#/display?open=35"
has "开门 35° 正视投影" "门开 35°" "正视投影"
dump "#/display?tab=bom"
has "采购页有合计与区间" "要买的东西" "区间"
hasnt "数量单位不重复" "批 个"

echo "== 6. 路由与标题"
dump "#/tray"
has "标题随路由切换" "桌面收纳柜"
dump "#/nope"
has "未知路由回首页" "尺寸算法"

echo
echo "通过 $pass / $((pass+fail))"
if [ "$fail" -gt 0 ]; then
  printf '  - %s\n' "${fails[@]}"
  exit 1
fi