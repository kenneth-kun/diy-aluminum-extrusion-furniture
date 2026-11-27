# 骨架模板（复制 → 改数学）

四个现成模块就是活模板，路径对照：

| 骨架 | 最接近的现成实现 |
|---|---|
| 内核 | `src/cores/tray.js`（最简）/ `src/cores/display.js`（有可动件） |
| 内核工具函数 | `floor5` `round5` `line` `money`（见下） |
| 正视图 | `src/draw/tray.js`（直立方体）/ `src/draw/display.js`（门/角度） |
| 页面 | `src/views/DisplayView.vue`（四页签最完整） |
| 测试 | `tests/tray.test.js`（12 段式）/ `tests/display.test.js`（120 项） |
| 文档 | `亚克力展示盒.md`（十节结构） |

---

## 1. 内核 `src/cores/<id>.js`

```js
/*!
 * <id>-core.js —— <中文名>「切料 + 预算」纯逻辑层
 * 不依赖 DOM：ESM，Node 里可直接 import 跑测试。
 * 所有内部长度单位为 mm，界面输入用 cm。
 */
const api = (function () {
  "use strict";

  /* ---------- 规格表（界面直接渲染 label） ---------- */
  const PROFILES = {
    "2020": { label: "2020（20×20）", size: 20, slot: 6, price: 10 },
    "3030": { label: "3030（30×30）", size: 30, slot: 8, price: 18 }
  };
  const SHEETS = { "5": { label: "5 mm 浇铸透明", th: 5, price: 280 } };
  const FEETS  = { pad: { label: "硅胶脚垫", h: 5, price: 1.5 } };
  const CAPFIX = {                                   // 端盖三态（有端盖的方案才需要）
    press:   { label: "卡扣端盖（免攻丝）", price: 0.4, hole: 0, tap: false, screw: false },
    tap:     { label: "螺丝端盖（端面攻丝）", price: 0.9, hole: 1, tap: true,  screw: true  },
    selftap: { label: "自攻端盖（自攻钉）",   price: 0.6, hole: 1, tap: false, screw: true  }
  };

  /* ---------- 价格（元，区间中值） ---------- */
  const PRICE = {
    bracket: 1.6, endcap: 0.4, tapPerHole: 1.2, tapMin: 10,
    cutPerM: 1.0, screwPack: 30
  };

  /* ---------- 搜索关键词（BOM 每行都要有） ---------- */
  const KW = {
    profile: "铝型材 2020 切割 定制",
    endcap: "铝型材端盖 2020 塑料",
    cut: "铝型材 切割加工 定制"
  };

  const CLEAR = 14;   // 层间余量（盆顶到上一层梁底）

  /* ---------- 小工具 ---------- */
  const num = (v, d) => (isFinite(Number(v)) ? Number(v) : d);
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const floor5 = (v) => Math.floor(v / 5) * 5;   // 宁短不长
  const round5 = (v) => Math.round(v / 5) * 5;

  function line(name, spec, price, note, kw) {
    return { name, spec, price: Math.round(price), note: note || "", kw: kw || "", lo: 0, hi: 0 };
  }

  /* ---------- 主计算 ---------- */
  function compute(input) {
    const o = {
      W: clamp(num(input.W, 300), 150, 800),
      /* …其余参数，每个都 clamp 到物理上说得通的范围… */
      prof: PROFILES[input.prof] ? input.prof : "2020",
      capFix: CAPFIX[input.capFix] ? input.capFix : "press"
    };
    const pr = PROFILES[o.prof], caps = CAPFIX[o.capFix];

    /* --- 尺寸：先内空，再外廓；每一步写清为什么 --- */
    const Wi = o.W - 2 * pr.size;
    const frameH = floor5(/* … */);

    /* --- 切料 --- */
    const cut = [];
    const addCut = (name, len, qty) => cut.push({ name, len, qty });
    addCut("立柱", frameH, 4);

    /* --- 五金 / 板材 --- */
    const lines = [];
    lines.push(line("铝型材 " + pr.label, (totalM).toFixed(2) + " m", totalM * pr.price, "", KW.profile));
    lines.push(line("型材端盖", caps.label + "，按型材规格配", endcaps * caps.price,
      "", caps.screw ? "铝型材端盖 2020 带螺丝 M4" : KW.endcap));
    if (caps.tap) {
      lines.push(line("端面攻丝（M4）", "每根型材端面 1 孔 · 卖家加工",
        Math.max(PRICE.tapMin, Math.round(endcaps * PRICE.tapPerHole)), "", "铝型材 端面攻丝 M4 加工 定制"));
    }

    /* --- 合计与区间（四套内核统一系数） --- */
    const total = lines.reduce((s, l) => s + l.price, 0);
    lines.forEach((l) => { l.lo = Math.round(l.price * 0.82); l.hi = Math.round(l.price * 1.22); });

    /* --- 提醒：warnings 讲风险，notes 讲工艺 --- */
    const warnings = [], notes = [];
    if (frameH > 1100) warnings.push("总高 1100 mm 以上要上墙固定，否则撞一下就倒。");

    return {
      input: o, dims: { W, D, H, Wi, Di, frameH, … }, cut, panels,
      lines, total, totalMin: Math.round(total * 0.82), totalMax: Math.round(total * 1.22),
      warnings, notes, capFix: o.capFix, capLabel: caps.label, capCount: endcaps, capHoles: endcaps * caps.hole,
      capNote: caps.tap ? "卖家在端面中心孔攻 M4 螺纹，M4×10 沉头螺丝锁紧，最牢"
            : caps.screw ? "自攻钉低速拧入 3–4 圈，拧歪会撑大孔"
            : "塑料卡扣直接压进型材端面，最省事，反复拆会松",
      explain: "…一句话把公式讲成算术…"
    };
  }

  /* ---------- 装配 ---------- */
  function buildSteps(p) {
    const caps = CAPFIX[p.capFix] || CAPFIX.press;   // buildSteps 是独立函数，别忘了解构
    const steps = [
      { n: 1, title: "收货核对", desc: "…", check: "…" },
      { n: 2, title: "处理切口", desc: "…", check: "…" }
    ];
    const tools = [{ name: "内六角 4 号", note: "…" }];
    const pitfalls = [{ title: "别用普通螺丝直接拧进型材", text: "必须 T 螺母 + 内六角…" }];
    return { intro: "…", steps, tools, pitfalls, keyNumbers: [{ k: "外廓", v: p.dims.W + "×" + p.dims.D }, …] };
  }

  /* ---------- 导出 ---------- */
  function toText(p) { /* 给卖家的纯文本 */ }
  function toCSV(p)  { /* 给 Excel 的 CSV */ }

  return { PROFILES, SHEETS, FEETS, CAPFIX, PRICE, KW, compute, buildSteps, toText, toCSV };
})();

export default api;
```

**检查点**：写完先跑一次，把 `dims` 逐项打出来，看是否"像人话"；再把 `lines` 加总，看总价落在你估的数量级里。

---

## 2. 正视图 `src/draw/<id>.js`

```js
const ALU = "#e9e4d8", ALU_S = "#a9a29a", DIMC = "#a8512a", PAPER = "#fcfaf4";

const rect = (x, y, w, h, fill, stroke) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" stroke="${stroke}" stroke-width="1"/>`;

const dimH = (x1, x2, y, label) =>
  `<g stroke="${DIMC}" stroke-width="1" fill="none"><path d="M${x1} ${y}H${x2}"/>` +
  `<path d="M${x1} ${y - 4}v8M${x2} ${y - 4}v8"/></g>` +
  `<text x="${(x1 + x2) / 2}" y="${y - 7}" text-anchor="middle" fill="${DIMC}" font-size="11.5">${label}</text>`;

export function draw<Name>(p) {
  const { W, D, H } = p.dims;
  const ML = 72, MR = 96, MT = 56, MB = 38;          // 视口留白，改了要复看尺寸线是否压字
  const vw = W + ML + MR, vh = H + MT + MB;
  const X = (x) => ML + x;
  const Y = (y) => vh - MB - y;                       // 不用 transform：文字不会镜像

  const o = [
    `<svg viewBox="0 0 ${vw} ${vh}" xmlns="http://www.w3.org/2000/svg" font-family="-apple-system,PingFang SC,sans-serif" font-size="12">`,
    `<rect width="100%" height="100%" fill="${PAPER}"/>`
  ];
  /* … 立柱、每层、端盖、顶板、脚 … */
  o.push(dimH(X(0), X(W), Y(H) - 18, W + " mm"));
  o.push(`<text x="${X(W / 2)}" y="${vh - 9}" text-anchor="middle" fill="#9a938a" font-size="11">正视图 · ${p.dims.N} 层</text>`);
  o.push("</svg>");
  return o.join("");
}
```

---

## 3. 页面 `src/views/<Name>View.vue`

```vue
<script setup>
import { ref, computed } from "vue";
import T from "../cores/<id>.js";
import { persisted } from "../lib/store.js";
import { readQuery, copyText, downloadText, docHref } from "../lib/util.js";
import { draw<Name> } from "../draw/<id>.js";
import { bomRows, bomTotals, normSteps } from "../lib/adapt.js";
import PlanHead from "../components/PlanHead.vue";
import StatBar from "../components/StatBar.vue";
import TabsNav from "../components/TabsNav.vue";
import MsgList from "../components/MsgList.vue";
import BomTable from "../components/BomTable.vue";
import StepsList from "../components/StepsList.vue";
import FieldNum from "../components/FieldNum.vue";
import Seg from "../components/Seg.vue";

const q = readQuery();
const DEFAULTS = { /* 与内核默认一致 */ };
const state = persisted("diy:<id>:v2", DEFAULTS, {
  drop: [],                                    // 只影响看图的状态放这里
  query: { W: q.w ? Number(q.w) * 10 : undefined }
});
const tab = ref(["plan", "cut", "bom", "install"].includes(q.tab) ? q.tab : "plan");
const TABS = [
  { key: "plan", label: "设计" }, { key: "cut", label: "切料表" },
  { key: "bom", label: "采购" }, { key: "install", label: "装配" }
];

const plan = computed(() => T.compute<Name>(state));
const svg = computed(() => draw<Name>(plan.value));
const bom = computed(() => bomRows(plan.value));
const totals = computed(() => bomTotals(plan.value));
const steps = computed(() => normSteps(T.buildSteps(plan.value)));
const opts = (map) => Object.entries(map).map(([v, o]) => ({ v, label: o.label }));
</script>

<template>
  <main class="page">
    <PlanHead no="05" title="<中文名>" lede="<一句话说清它靠什么成立>">
      <a class="btn" :href="docHref('<中文名>.md')">说明书 →</a>
    </PlanHead>
    <div class="planner">
      <aside class="panel"><!-- 01..0N 参数组 --></aside>
      <section class="sheet">
        <TabsNav v-model="tab" :tabs="TABS" />
        <div v-if="tab === 'plan'" class="tabpane">
          <StatBar :hero="[...]" :dims="[...]" />
          <p class="explain">{{ plan.explain }}</p>
          <div class="blueprint-frame blueprint"><div class="preview" v-html="svg"></div></div>
          <MsgList :warnings="plan.warnings" :notes="plan.notes" />
        </div>
        <!-- cut / bom / install -->
      </section>
    </div>
  </main>
</template>
```

---

## 4. 测试 `tests/<id>.test.js`

```js
"use strict";
import T from "../src/cores/<id>.js";

let pass = 0, fail = 0; const fails = [];
const ok = (n, c, x) => (c ? (pass++, console.log("  ✓ " + n)) : (fail++, fails.push(n + (x ? " → " + x : "")), console.log("  ✗ " + n + (x ? " → " + x : ""))));
const eq = (n, got, want) => ok(n + " = " + want, got === want, "实得 " + got);
const near = (n, got, want, tol) => ok(n + " ≈ " + want, Math.abs(got - want) <= tol, "实得 " + got);

console.log("\n[1] 默认方案");
const p = T.compute<Name>({});
eq("外宽", p.dims.W, 455);
eq("总价", p.total, 303);
ok("BOM 每行都有搜索词", p.lines.every((l) => l.kw && l.kw.length > 2));

console.log("\n[2] 参数变化");
/* 改一层、改材料、改端盖，断言数字真的动，且方向对 */

console.log("\n[3] 边界");
/* 超出范围要 clamp；非法枚举要回落默认 */

console.log("\n[4] 切料 / [5] 五金 / [6] 警告 / [7] 导出");

console.log("\n" + (fail ? "✗ " + fail + " 项失败" : "✓ 全部通过") + "（" + pass + "/" + (pass + fail) + "）");
if (fail) { fails.forEach((f) => console.log("  - " + f)); process.exit(1); }
```

DOM 测试追加到 `tests/run-dom-tests.sh`：

```bash
echo "== 7. <中文名>（#/<id>）"
dump "#/<id>"
has "默认外廓" "455×355" "475 mm"
has "总价" "¥303"
dump "#/<id>?tab=cut"
has "切料总长" "6.46 m"
dump "#/<id>?tab=bom"
has "比价链接" "1688" "淘宝" "京东"
hasnt "数量单位不重复" "批 个"
```

---

## 5. 文档十节骨架

```
# <中文名>（<一句话卖点>）
原帖链接 + 卖点引用
## 一、它到底是什么（结构拆解表）
## 二、为什么这个结构成立（四条以内）
## 三、尺寸公式（一步步推导，含 floor5 规则）
## 四、切料表（表）+ 下单话术（两段，直接复制）
## 五、五金与端盖（若涉及攻丝，写清 φ4.2/φ6.8 的区别）
## 六、采购清单（明细 + 总价 + 区间）+ 省钱三法
## 七、装配 N 步（每步验收标准）+ 工具 + 时长
## 八、六个坑
## 九、参数对照表（默认/最小/最大 → 结果怎么变）+ 与其他套对比
## 十、文件索引 + URL 参数 + 参考
```