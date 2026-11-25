#!/bin/bash
# cabinet-dom-test.sh —— 在真实浏览器里跑一遍渲染回归（headless Chrome + --dump-dom）
# 用法：bash cabinet-dom-test.sh
set -u
cd "$(dirname "$0")"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
[ -x "$CHROME" ] || { echo "找不到 Chrome，跳过 DOM 测试"; exit 0; }
PASS=0; FAIL=0
say() { if [ "$2" = "1" ]; then PASS=$((PASS+1)); echo "  ✓ $1"; else FAIL=$((FAIL+1)); echo "  ✗ $1"; fi; }

dump() {
  local q="$1"; local dir; dir=$(mktemp -d)
  "$CHROME" --headless=new --no-sandbox --disable-gpu --disable-breakpad \
    --disable-crash-reporter --user-data-dir="$dir" --dump-dom \
    "file://$PWD/cabinet.html$q" 2>/dev/null
  rm -rf "$dir"
}
has() { case "$1" in *"$2"*) echo 1;; *) echo 0;; esac; }
title_ok() { case "$(grep -o '<title>[^<]*' <<<"$1" | head -1)" in *ERR*) echo 0;; *) echo 1;; esac; }

echo "[1] 默认方案渲染"
D=$(dump "")
say "抽屉数 4" "$(has "$D" '>4<')"
say "单抽净高 155" "$(has "$D" '>155<')"
say "内空 390×340×640" "$(has "$D" '390×340×640')"
say "切料含 700 mm" "$(has "$D" '700 mm</td>')"
say "切料含 385 mm" "$(has "$D" '385 mm</td>')"
say "SVG 已生成" "$(has "$D" '<svg viewBox')"
say "无 JS 错误" "$(title_ok "$D")"

echo "[2] 改尺寸 + 改抽屉数（URL 参数）"
D2=$(dump "?w=60&d=45&h=90&n=5")
say "抽屉数 5" "$(has "$D2" '>5<')"
say "内空 540" "$(has "$D2" '540×')"
say "无 JS 错误" "$(title_ok "$D2")"

echo "[3] 切料表页"
D3=$(dump "?tab=cut")
say "有型材切料标题" "$(has "$D3" '型材切料')"
say "有面板尺寸标题" "$(has "$D3" '面板尺寸')"
say "有下单话术" "$(has "$D3" '长虹纹亚克力下单话术')"
say "设计页已隐藏" "$(has "$D3" 'id="tab-plan" class="hidden"')"

echo "[4] 装配页"
D4=$(dump "?tab=install")
say "有装配顺序" "$(has "$D4" '装配顺序')"
say "首步 切料核对" "$(has "$D4" '切料核对')"
say "末步 负载测试" "$(has "$D4" '负载测试')"
say "13 个步骤标题（含装端盖）" "$([ "$(grep -o 'class="step"' <<<"$D4" | wc -l | tr -d ' ')" = "14" ] && echo 1 || echo 0)"
say "有验收标记" "$(has "$D4" 'class="check"')"

echo "[5] 采购页"
D5=$(dump "?tab=bom")
say "有采购表" "$(has "$D5" '要买的东西')"
say "有合计" "$(has "$D5" 'id="totalTxt"')"

echo "[6] 端盖固定方式（攻丝）"
D6=$(dump "?capFix=tap")
say "有端盖下拉" "$(has "$D6" 'id="capFix"')"
say "话术改成攻丝" "$(has "$D6" '端面攻 M4 螺纹（共 56 孔）')"
say "采购页有攻丝行" "$(has "$D6" '>端面攻丝（M4）<')"
say "装配页有装端盖步" "$(has "$D6" '>装端盖<')"
say "攻丝方案 ¥1312" "$(has "$D6" '¥1312')"
D7=$(dump "?capFix=selftap")
say "自攻：话术不攻丝" "$(has "$D7" '两端不攻丝（用自攻钉）')"
D8=$(dump "")
say "默认卡扣：话术不攻丝" "$(has "$D8" 'id="tapWords">两端不攻丝')"


echo ""
if [ "$FAIL" = "0" ]; then echo "✅ $PASS 通过 / 0 失败"; else echo "❌ $PASS 通过 / $FAIL 失败"; exit 1; fi
