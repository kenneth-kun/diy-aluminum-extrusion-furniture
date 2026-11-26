<script setup>
import { ref, computed } from "vue";
import T from "../cores/tray.js";
import { persisted } from "../lib/store.js";
import { readQuery, copyText, downloadText, docHref } from "../lib/util.js";
import { drawTray } from "../draw/tray.js";
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
const DEFAULTS = { N: 3, bin: "mid", binW: 400, binD: 300, binH: 120, prof: "2020", top: "amber", feet: "pad", color: "green", baseRigid: true, capFix: "press" };
const state = persisted("diy:tray:v2", DEFAULTS, {
  query: { bin: q.bin, binW: q.bw ? Number(q.bw) * 10 : undefined, binD: q.bd ? Number(q.bd) * 10 : undefined, binH: q.bh ? Number(q.bh) * 10 : undefined, N: q.n ? Number(q.n) : undefined, prof: q.prof, top: q.top, feet: q.feet, color: q.color, capFix: q.capFix }
});

const tab = ref(["plan", "cut", "bom", "install"].includes(q.tab) ? q.tab : "plan");
const TABS = [
  { key: "plan", label: "设计" },
  { key: "cut", label: "切料表" },
  { key: "bom", label: "采购" },
  { key: "install", label: "装配" }
];

const plan = computed(() => T.computeTray(state));
const svg = computed(() => drawTray(plan.value));
const bom = computed(() => bomRows(plan.value));
const totals = computed(() => bomTotals(plan.value));
const steps = computed(() => normSteps(T.buildSteps(plan.value)));
const opts = (map) => Object.entries(map).map(([v, o]) => ({ v, label: o.label }));

const binHint = computed(() => {
  const p = plan.value;
  return "当前盆 " + p.dims.binW + "×" + p.dims.binD + "×" + p.dims.binH + " mm，每侧余量 " + (p.dims.Wi - p.dims.binW) / 2 + " mm。";
});
const nHint = computed(() => {
  const p = plan.value;
  return p.dims.N + " 层 × 层距 " + p.dims.Hd + " mm，总高 " + p.dims.H + " mm" + (p.dims.H > 500 ? "（偏高，小心碰倒）" : "。");
});
const tapWords = computed(() => {
  const p = plan.value;
  return p.capHoles ? "端面攻 M4 螺纹（共 " + p.capHoles + " 孔）" : p.capFix === "selftap" ? "两端不攻丝（用自攻钉）" : "两端不攻丝";
});
const capLine = computed(() => {
  const p = plan.value;
  return "端盖：" + p.capCount + " 个 · " + p.capLabel + (p.capHoles ? "，需攻丝 " + p.capHoles + " 孔（卖家可代攻，约 1.2 元/孔）" : "，直接压入端面");
});
const footnote = "价格为淘宝 / 1688 常见区间估算，不含运费；盆按工业塑料周转箱计价，实际按型号浮动。";

function copyAll() { copyText(T.toText(plan.value)); }
function copyKw() { copyText(plan.value.lines.map((l) => l.name + "\t" + l.kw + "\t" + l.spec).join("\n")); }
function csv() { downloadText("桌面收纳柜-切料清单.csv", "\ufeff" + T.toCSV(plan.value), "text/csv;charset=utf-8"); }
function reset() { Object.assign(state, DEFAULTS); }
</script>

<template>
  <main class="page">
    <PlanHead no="03" title="桌面收纳柜 · 盆位规划器" lede="4 根 2020 立柱 + N+1 组托架，工业塑料盆直接坐在梁上抽拉，一点五金不装；加层就是再加一组梁。">
      <a class="btn" :href="docHref('铝型材桌面柜.md')">说明书 →</a>
    </PlanHead>

    <div class="planner">
      <aside class="panel">
        <div class="group">
          <div class="group-title"><span class="no">01</span><h2>收纳盆</h2></div>
          <div class="field">
            <div class="field-row"><label>型号</label></div>
            <select v-model="state.bin">
              <option v-for="o in opts(T.BINS)" :key="o.v" :value="o.v">{{ o.label }}</option>
            </select>
          </div>
          <template v-if="state.bin === 'custom'">
            <FieldNum v-model="state.binW" label="盆宽" :min="15" :max="90" unit="cm" />
            <FieldNum v-model="state.binD" label="盆深" :min="10" :max="60" unit="cm" />
            <FieldNum v-model="state.binH" label="盆高" :min="5" :max="30" unit="cm" />
          </template>
          <p class="hint">{{ binHint }}</p>
        </div>

        <div class="group">
          <div class="group-title"><span class="no">02</span><h2>层数</h2></div>
          <Seg
            :model-value="state.N"
            :options="[1, 2, 3, 4, 5].map((n) => ({ v: n, label: n + ' 层' }))"
            @update:model-value="(v) => (state.N = v)"
          />
          <p class="hint">{{ nHint }}</p>
        </div>

        <div class="group">
          <div class="group-title"><span class="no">03</span><h2>型材与配色</h2></div>
          <div class="field">
            <div class="field-row"><label>型材</label></div>
            <select v-model="state.prof">
              <option v-for="o in opts(T.PROFILES)" :key="o.v" :value="o.v">{{ o.label }}</option>
            </select>
          </div>
          <div class="field">
            <div class="field-row"><label>端盖颜色</label></div>
            <select v-model="state.color">
              <option v-for="o in opts(T.COLORS)" :key="o.v" :value="o.v">{{ o.label }}</option>
            </select>
          </div>
          <div class="field">
            <div class="field-row"><label>端盖固定</label></div>
            <select v-model="state.capFix">
              <option v-for="o in opts(T.CAPFIX)" :key="o.v" :value="o.v">{{ o.label }}</option>
            </select>
            <p class="hint">{{ plan.capNote }}</p>
          </div>
        </div>

        <div class="group">
          <div class="group-title"><span class="no">04</span><h2>顶板 / 脚 / 底框</h2></div>
          <div class="field">
            <div class="field-row"><label>顶板</label></div>
            <select v-model="state.top">
              <option v-for="o in opts(T.TOPS)" :key="o.v" :value="o.v">{{ o.label }}</option>
            </select>
          </div>
          <div class="field">
            <div class="field-row"><label>脚</label></div>
            <select v-model="state.feet">
              <option v-for="o in opts(T.FEETS)" :key="o.v" :value="o.v">{{ o.label }}</option>
            </select>
          </div>
          <label class="toggle">底框加纵向加强梁</label>
          <Seg
            :model-value="state.baseRigid"
            :options="[{ v: true, label: '加（更稳）' }, { v: false, label: '不加' }]"
            @update:model-value="(v) => (state.baseRigid = v)"
          />
        </div>

        <div class="group">
          <p class="hint">改任意参数都会自动重算；结果只保存在本机浏览器里，不上传。</p>
        </div>
      </aside>

      <section class="sheet">
        <TabsNav v-model="tab" :tabs="TABS" />

        <div v-if="tab === 'plan'" class="tabpane">
          <StatBar
            :hero="[
              { v: plan.dims.N, label: '层' },
              { v: plan.dims.W + '×' + plan.dims.D, label: '外廓 宽×深' },
              { v: '¥' + plan.total, label: '材料估算' }
            ]"
            :dims="[
              { label: '总高', value: plan.dims.H + ' mm' },
              { label: '层距', value: plan.dims.Hd + ' mm' },
              { label: '立柱', value: plan.dims.Lv + ' mm' },
              { label: '切料总长', value: plan.cutTotalM.toFixed(2) + ' m' }
            ]"
          />
          <p class="explain">{{ plan.explain }}</p>

          <div class="sub">正视图 + 配色</div>
          <div class="blueprint-frame blueprint">
            <div class="preview" v-html="svg"></div>
          </div>

          <div class="chiprow wrap" style="margin-top: 12px">
            <span v-for="(c, i) in plan.colors" :key="i" class="sw"><i :style="{ background: c.hex }"></i>第 {{ i + 1 }} 层 · {{ c.name }}</span>
            <span class="sw"><i :style="{ background: plan.capColor }"></i>端盖</span>
          </div>

          <MsgList :warnings="plan.warnings" :notes="plan.notes" />
        </div>

        <div v-else-if="tab === 'cut'" class="tabpane">
          <div class="sub">型材切料（给卖家）</div>
          <div class="tableWrap">
            <table>
              <thead><tr><th>部件</th><th class="n">长度</th><th class="n">数量</th><th class="n">合计</th></tr></thead>
              <tbody>
                <tr v-for="(c, i) in plan.cut" :key="i">
                  <td class="name">{{ c.name }}</td>
                  <td class="n">{{ c.len }} mm</td>
                  <td class="n">{{ c.qty }} 根</td>
                  <td class="n spec">{{ (c.len * c.qty / 1000).toFixed(2) }} m</td>
                </tr>
              </tbody>
              <tfoot><tr><td colspan="3">型材总长</td><td class="n">{{ plan.cutTotalM.toFixed(2) }} m</td></tr></tfoot>
            </table>
          </div>
          <p class="hint" style="margin-top: 10px">
            下单话术：「{{ T.PROFILES[plan.input.prof].label }} 切割：按上表长度，<span>{{ tapWords }}</span>，切口去毛刺」。
          </p>
          <p class="hint">{{ capLine }}</p>

          <div class="sub">顶板</div>
          <div class="tableWrap">
            <table>
              <thead><tr><th>部件</th><th class="n">尺寸</th><th class="n">数量</th><th>材料</th></tr></thead>
              <tbody>
                <tr v-if="plan.panels.length" v-for="(x, i) in plan.panels" :key="i">
                  <td class="name">{{ x.name }}</td>
                  <td class="n">{{ x.w }} × {{ x.h }} mm</td>
                  <td class="n">{{ x.qty }} 块</td>
                  <td class="spec">{{ x.mat }}</td>
                </tr>
                <tr v-if="!plan.panels.length"><td colspan="4" class="spec">本方案不装顶板</td></tr>
              </tbody>
              <tfoot><tr><td colspan="3">板材面积</td><td class="n">{{ plan.panelArea.toFixed(2) }} ㎡</td></tr></tfoot>
            </table>
          </div>
        </div>

        <div v-else-if="tab === 'bom'" class="tabpane">
          <BomTable
            :rows="bom"
            :total="totals.total"
            :lo="totals.lo"
            :hi="totals.hi"
            :footnote="footnote"
            @copy="copyAll"
            @copykw="copyKw"
            @csv="csv"
            @reset="reset"
          />
        </div>

        <div v-else class="tabpane">
          <StatBar v-if="steps.keyNumbers.length" :dims="steps.keyNumbers.map((k) => ({ label: k.k, value: k.v }))" style="margin-bottom: 14px" />
          <StepsList :intro="steps.intro" :steps="steps.steps" :tools="steps.tools" :pitfalls="steps.pitfalls" />
        </div>
      </section>
    </div>
  </main>
</template>