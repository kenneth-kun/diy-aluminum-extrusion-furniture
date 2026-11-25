#!/bin/bash
# display-dom-test.sh —— 亚克力展示盒规划器：真实浏览器渲染回归（headless Chrome + --dump-dom）
# 用法：bash display-dom-test.sh
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
    "file://$PWD/display.html$q" 2>/dev/null
  rm -rf "$dir"
}
has() { case "$1" in *"$2"*) echo 1;; *) echo 0;; esac; }
hasnt() { case "$1" in *"$2"*) echo 0;; *) echo 1;; esac; }
title_ok() { case "$(grep -o '<title>[^<]*' <<<"$1" | head -1)" in *ERR*) echo 0;; *) echo 1;; esac; }
count() { grep -o "$2" <<<"$1" | wc -l | tr -d ' '; }
# 去掉 <script> 再数，避免把源码里的模板字符串当节点
strip() { python3 -c "import sys,re;print(re.sub(r'<script.*?</script>','',sys.stdin.read(),flags=re.S))" <<<"$1"; }

echo "[1] 默认方案（3 层 · 30×25×25 cm）"
D=$(dump "")
say "层数 3" "$(has "$D" '<b id="hN">3</b>')"
say "外廓 310×260" "$(has "$D" '<b id="hD">310×260</b>')"
say "总价 ¥711" "$(has "$D" '<b id="hP">¥711</b>')"
say "总高 814" "$(has "$D" '<b id="dH">814 mm</b>')"
say "单层高 270" "$(has "$D" '<b id="dL">270 mm</b>')"
say "门板 298×246" "$(has "$D" '<b id="dDoor">298×246</b>')"
say "整箱 7.2 kg" "$(has "$D" '<b id="dW">7.2 kg</b>')"
say "说明含外廓" "$(has "$D" '310×260×814')"
say "SVG 已生成" "$(has "$D" '<svg viewBox')"
say "图例有亚克力" "$(has "$D" '亚克力 5 mm')"
say "无 JS 错误" "$(title_ok "$D")"

echo "[2] 门开 35°（URL 参数）"
D2=$(dump "?open=35")
say "门开角度文案" "$(has "$D2" '门开 35°（任意停）')"
say "正视投影数值" "$(has "$D2" '正视投影 202 mm')"
say "侧视小图" "$(has "$D2" '>侧视<')"
say "幽灵框虚线" "$(has "$D2" 'stroke-dasharray="3 3"')"
say "角度按钮高亮" "$(has "$D2" '<button data-a="35" class="on">')"

echo "[3] 层数与尺寸（URL 参数）"
D3=$(dump "?n=5&w=40&d=20&h=30")
say "5 层" "$(has "$D3" '<b id="hN">5</b>')"
say "内空 400×200×300" "$(has "$D3" '内空 400×200×300')"
say "外廓 410×210" "$(has "$D3" '<b id="hD">410×210</b>')"
say "5 层总高 = 5×320+1+3" "$(has "$D3" '<b id="dH">1604 mm</b>')"

echo "[4] 切料页"
D4=$(dump "?tab=cut")
say "切料页已显示" "$(has "$D4" 'id="tab-cut" class=""')"
say "侧板 260×6" "$(has "$D4" '260 mm</td><td class="n">6 片')"
say "后板 300×3" "$(has "$D4" '300 mm</td><td class="n">3 片')"
say "门板 246×3" "$(has "$D4" '246 mm</td><td class="n">3 片')"
say "顶盖 260×1" "$(has "$D4" '260 mm</td><td class="n">1 片')"
say "切割合计 4.39 m / 1.21 ㎡" "$(has "$D4" 'id="cutSum">4.39 m / 1.21 ㎡')"
say "铝梁 300×3" "$(has "$D4" '300 mm</td><td class="n">3 根')"
say "铝梁合计 1.20 m" "$(has "$D4" 'id="alSum">1.20 m')"
say "亚克力下单话术" "$(has "$D4" '透明亚克力，按尺寸激光切割')"
say "铝梁下单话术含攻丝" "$(has "$D4" '两端攻 M4')"
say "无 JS 错误" "$(title_ok "$D4")"

echo "[5] 采购页"
D5=$(dump "?tab=bom")
say "采购页已显示" "$(has "$D5" 'id="tab-bom" class=""')"
say "合计 ¥711" "$(has "$D5" 'id="totalTxt">¥711')"
say "区间 583–867" "$(has "$D5" '区间 583–867')"
say "1688 链接（GBK）" "$(has "$D5" 's.1688.com/selloffer/offer_search.htm?keywords=%')"
say "淘宝链接" "$(has "$D5" 's.taobao.com/search?q=')"
say "京东链接" "$(has "$D5" 'search.jd.com/Search?keyword=')"
say "合页行" "$(has "$D5" '任意停合页')"
say "每行都有搜索链" "$(python3 -c "
import sys,re
h=re.sub(r'<script.*?</script>','',sys.stdin.read(),flags=re.S)
rows=re.findall(r'<tr>(.*?)</tr>',h)
n=len([r for r in rows if 's.1688.com' in r]); print(1 if n==11 else 0)" <<<"$D5")"

echo "[6] 装配页"
D6=$(dump "?tab=install")
B6=$(strip "$D6")
say "装配页已显示" "$(has "$D6" 'id="tab-install" class=""')"
say "10 个步骤" "$([ "$(count "$B6" 'class="no">')" = "10" ] && echo 1 || echo 0)"
say "有「门板钻孔」步" "$(has "$D6" '门板钻孔')"
say "有悬停验收文案" "$(has "$D6" '30°/60°/90°')"
say "工具含 φ4.2" "$(has "$D6" '4.2')"
say "6 个坑" "$([ "$(count "$B6" 'class="msg warn">')" = "6" ] && echo 1 || echo 0)"
say "坑里有「不能上油」" "$(has "$D6" '绝对不能上油')"
say "无 JS 错误" "$(title_ok "$D6")"

echo "[7] 不做门 / 3 mm 薄板 / 尺寸告警"
D7=$(dump "?hinge=none")
say "无门也出图" "$(has "$D7" '<svg viewBox')"
say "说明写无门" "$(has "$D7" '无门')"
say "无门无合页行" "$(python3 -c "
import sys,re
h=re.sub(r'<script.*?</script>','',sys.stdin.read(),flags=re.S)
print(0 if \"class='name'>任意停合页\" in h else 1)" <<<"$D7")"
D8=$(dump "?sheet=3&w=50")
say "3 mm 标签" "$(has "$D8" '3 mm 浇铸透明')"
say "3 mm 门宽提醒" "$(has "$D8" '3 mm 门宽 498 mm')"
D9=$(dump "?d=15&n=5")
say "内深提醒" "$(has "$D9" '放不下大多数手办底座')"
say "重心提醒" "$(has "$D9" '重心高')"

echo "[8] 布局与编码"
D10=$(dump "?debug=1")
say "无横向溢出" "$(python3 -c "
import sys,re
h=sys.stdin.read()
m=re.search(r'<title>W(\d+) SW(\d+)',h)
print(1 if m and m.group(1)==m.group(2) else 0)" <<<"$D10")"
D11=$(dump "?debug=gbk")
say "GBK 编码器可用" "$(has "$D11" '<title>GBK:%D1%C7%BF%CB%C1%A6%20test</title>')"
D12=$(dump "?tab=cut&lid=none&rail=flat&feet=metal")
say "无顶盖时顶部无顶盖行" "$(python3 -c "
import sys,re
h=re.sub(r'<script.*?</script>','',sys.stdin.read(),flags=re.S)
print(0 if '>顶盖<' in h.split('亚克力切料')[1].split('铝梁切料')[0] else 1)" <<<"$D12")"
say "扁铝切料标签" "$(has "$D12" '10×20 扁铝')"
say "扁铝带攻丝行（采购页）" "$(has "$(dump "?rail=flat&tab=bom")" '端面攻丝')"

echo ""
if [ "$FAIL" = "0" ]; then echo "✓ 通过 $PASS / $((PASS+FAIL))"; else echo "✗ 失败 $FAIL / $((PASS+FAIL))"; exit 1; fi