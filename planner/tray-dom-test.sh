#!/bin/bash
# tray-dom-test.sh —— 桌面收纳柜规划器：真实浏览器渲染回归（headless Chrome + --dump-dom）
# 用法：bash tray-dom-test.sh
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
    "file://$PWD/tray.html$q" 2>/dev/null
  rm -rf "$dir"
}
has() { case "$1" in *"$2"*) echo 1;; *) echo 0;; esac; }
hasnt() { case "$1" in *"$2"*) echo 0;; *) echo 1;; esac; }
title_ok() { case "$(grep -o '<title>[^<]*' <<<"$1" | head -1)" in *ERR*) echo 0;; *) echo 1;; esac; }
count() { grep -o "$2" <<<"$1" | wc -l | tr -d ' '; }
# 去掉 <script> 再数，避免把源码里的模板字符串当节点
strip() { python3 -c "import sys,re;print(re.sub(r'<script.*?</script>','',sys.stdin.read(),flags=re.S))" <<<"$1"; }

echo "[1] 默认方案（3 层 · 中盆）"
D=$(dump "")
say "层数 3" "$(has "$D" '<b id="hN">3</b>')"
say "外廓 455×355" "$(has "$D" '455×355')"
say "总高 475" "$(has "$D" '>475 mm<')"
say "层距 150" "$(has "$D" '>150 mm<')"
say "型材 6.46 m" "$(has "$D" '6.46 m')"
say "横向梁 415×8" "$(has "$D" '415 mm</td><td class="n">8 根')"
say "顶板 427×327" "$(has "$D" '427 × 327')"
say "SVG 已生成" "$(has "$D" '<svg viewBox')"
say "配色有砖红" "$(has "$D" '砖红')"
say "无 JS 错误" "$(title_ok "$D")"

echo "[2] 换盆 + 改层数（URL 参数）"
D2=$(dump "?bin=large&n=5")
say "5 层" "$(has "$D2" '<b id="hN">5</b>')"
say "外廓 555×405" "$(has "$D2" '555×405')"
say "层距 180" "$(has "$D2" '>180 mm<')"
say "无 JS 错误" "$(title_ok "$D2")"

echo "[3] 切料表页"
D3=$(dump "?tab=cut")
say "有型材切料标题" "$(has "$D3" '型材切料')"
say "有顶板给厂话术" "$(has "$D3" '琥珀色透明亚克力 3mm，按尺寸切好')"
say "设计页已隐藏" "$(has "$D3" 'id="tab-plan" class="hidden"')"
say "切料页已显示" "$(has "$D3" 'id="tab-cut" class=""')"

echo "[4] 采购页"
D4=$(dump "?tab=bom")
say "有采购表" "$(has "$D4" '要买的东西')"
say "有合计 ¥303" "$(has "$D4" 'id="totalTxt">¥303')"
say "有 1688 链接" "$(has "$D4" 's.1688.com')"
say "有淘宝链接" "$(has "$D4" 's.taobao.com')"
say "有京东链接" "$(has "$D4" 'search.jd.com')"

echo "[5] 装配页"
D5=$(dump "?tab=install")
say "有装配顺序" "$(has "$D5" '装配顺序')"
say "首步 切料核对" "$(has "$D5" '切料核对')"
say "末步 加载试抽" "$(has "$D5" '加载试抽')"
say "10 个步骤（含装端盖）" "$([ "$(count "$(strip "$D5")" 'class="no">')" = "10" ] && echo 1 || echo 0)"
say "有验收标记" "$(has "$D5" 'class="check"')"

echo "[6] 边界：不装顶板 / 3030"
D6=$(dump "?top=none&prof=3030")
say "顶板为空提示" "$(has "$D6" '本方案不装顶板')"
say "3030 外廓 475" "$(has "$D6" '475×')"
say "无 JS 错误" "$(title_ok "$D6")"

echo "[7] 布局不溢出"
D7=$(dump "?debug=1")
T7=$(grep -o '<title>[^<]*' <<<"$D7" | head -1)
W7=$(sed -n 's/.*W\([0-9]*\) SW\([0-9]*\).*/\1/p' <<<"$T7")
S7=$(sed -n 's/.*W\([0-9]*\) SW\([0-9]*\).*/\2/p' <<<"$T7")
say "scrollWidth 不大于 innerWidth ($W7/$S7)" "$([ "${S7:-0}" -le "${W7:-1}" ] && echo 1 || echo 0)"

echo "[8] 端盖固定方式（攻丝）"
D8=$(dump "?capFix=tap")
say "有端盖下拉" "$(has "$D8" 'id="capFix"')"
say "下拉有攻丝选项" "$(has "$D8" '螺丝端盖（端面攻丝）')"
say "下拉有自攻选项" "$(has "$D8" '自攻端盖（自攻钉）')"
say "话术改成攻丝" "$(has "$D8" '端面攻 M4 螺纹（共 28 孔）')"
say "切料页写明孔数" "$(has "$D8" '需攻丝 28 孔')"
say "采购页有攻丝行" "$(has "$D8" '>端面攻丝（M4）<')"
say "装配页有装端盖步" "$(has "$D8" '>装端盖<')"
say "攻丝方案更贵" "$(has "$D8" 'id="totalTxt">¥351')"
D9=$(dump "?capFix=selftap")
say "自攻：话术不攻丝" "$(has "$D9" '两端不攻丝（用自攻钉）')"
say "自攻：采购页无攻丝行" "$(hasnt "$D9" '>端面攻丝（M4）<')"
say "自攻：总价 ¥309" "$(has "$D9" 'id="totalTxt">¥309')"
D10=$(dump "")
say "默认卡扣：话术不攻丝" "$(has "$D10" 'id="tapWords">两端不攻丝')"
say "默认卡扣：总价 ¥303" "$(has "$D10" 'id="totalTxt">¥303')"


echo ""
if [ "$FAIL" = "0" ]; then echo "✅ $PASS 通过 / 0 失败"; else echo "❌ $PASS 通过 / $FAIL 失败"; exit 1; fi