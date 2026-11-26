<script setup>
import { ref, computed } from "vue";
import T from "../cores/display.js";
import { persisted } from "../lib/store.js";
import { readQuery } from "../lib/util.js";
import { drawDisplay } from "../draw/display.js";
import { bomRows, bomTotals, normSteps } from "../lib/adapt.js";
import { copyText, downloadText, docHref } from "../lib/util.js";
import PlanHead from "../components/PlanHead.vue";
import StatBar from "../components/StatBar.vue";
import TabsNav from "../components/TabsNav.vue";
import MsgList from "../components/MsgList.vue";
import BomTable from "../components/BomTable.vue";
import StepsList from "../components/StepsList.vue";
import FieldNum from "../components/FieldNum.vue";
import Seg from "../components/Seg.vue";

const q = readQuery();
const DEFAULTS = { W: 300, D: 250, H: 250, N: 3, sheet: "5", rail: "2020", hinge: "friction", lid: "full", feet: "pad" };

const state = persisted(
  "diy:display:v2",
  DEFAULTS,
  {
    drop: ["angle"],
    query: { W: q.w ? Number(q.w) * 10 : undefined, D: q.d ? Number(q.d) * 10 : undefined, H: q.h ? Number(q.h) * 10 : undefined, N: q.n ? Number(q.n) : undefined, sheet: q.sheet, rail: q.rail, hinge: q.hinge, lid: q.lid, feet: q.feet }
  }
);
state.angle = 0;
if (q.open != null && q.open !== "") state.angle = Number(q.open) || 0;

const tab = ref(["plan", "cut", "bom", "install"].includes(q.tab) ? q.tab : "plan");
const TABS = [
  { key: "plan", label: "方案" },
  { key: "cut", label: "切料表" },
  { key: "bom", label: "采购" },
  { key: "install", label: "装配" }
];

const plan = computed(() => T.computeDisplay(state));
const svg = computed(() => drawDisplay(plan.value, state.angle || 0));
const bom = computed(() => bomRows(plan.value));
const totals = computed(() => bomTotals(plan.value));
const steps = computed(() => normSteps(T.buildSteps(plan.value)));

const selectOpts = (map) => Object.entries(map).map(([v, o]) => ({ v, label: o.label }));

const sizeHint = computed(() => {
  const p = plan.value;
  return "内空 " + p.Wi + "×" + p.Di + "×" + p.Hi + " mm；" +
    (p.Di < 180 ? "常见手办底座 120–180 mm，内深刚够，斜放更省。" : "大多数 1/6 手办和车模都放得下。");
});
const nHint = computed(() => {
  const p = plan.value;
  return p.N + " 层 × 单层 " + p.Hl + " mm，总高 " + p.H + " mm" +
    (p.N > 1 ? "；加层不用改结构，再买一个盒体即可。" : "。");
});
const cutWords = computed(() => {
  const p = plan.value;
  return "下单话术：「" + p.sheet.label + " 透明亚克力，按尺寸激光切割，盒体（侧板+后板+底板）粘好发货；门板顶部开 R25 半圆手指槽，所有边倒角」。";
});
const cutAlWords = computed(() => {
  const p = plan.value;
  return "下单话术：「" + p.rail.label + "，按长度切 " + (p.N + (p.lid.th ? 1 : 0)) + " 根，两端攻 M4（装端盖和合页），切口去毛刺」。";
});
const footnote = computed(() =>
  "价格为淘宝 / 1688 常见区间估算，不含运费；亚克力按「" + plan.value.sheet.th + " mm 浇铸板 + 激光切割 + 盒体粘接」计价。"
);

function copyBom() { copyText(T.toText(plan.value)); }
function copyKw() {
  copyText(plan.value.lines.map((l) => l.name + "\t" + l.kw + "\t" + l.spec).join("\n"));
}
function csv() { downloadText("亚克力展示盒-切料清单.csv", "\ufeff" + T.toCSV(plan.value), "text/csv;charset=utf-8"); }
function reset() { Object.assign(state, DEFAULTS); state.angle = 0; }
</script>

<template>
  <main class="page">
    <PlanHead no="04" title="亚克力展示盒 · 悬停面板" lede="每层一个粘好的亚克力盒，前沿一根铝梁挂两片任意停合页——门停在任意角度，加层就是再叠一个盒子。">
      <a class="btn" :href="docHref('亚克力展示盒.md')">说明书 →</a>
    </PlanHead>

    <div class="planner">
      <aside class="panel">
        <div class="group">
          <div class="group-title"><span class="no">01</span><h2>盒体内部尺寸</h2></div>
          <FieldNum v-model="state.W" label="内宽" :min="15" :max="80" unit="cm" :slider-min="15" :slider-max="70" />
          <FieldNum v-model="state.D" label="内深" :min="12" :max="50" unit="cm" :slider-min="12" :slider-max="45" />
          <FieldNum v-model="state.H" label="单层净高" :min="12" :max="45" unit="cm" :slider-min="12" :slider-max="40" />
          <p class="hint">{{ sizeHint }}</p>
        </div>

        <div class="group">
          <div class="group-title"><span class="no">02</span><h2>层数</h2></div>
          <Seg
            :model-value="state.N"
            :options="[1, 2, 3, 4, 5, 6].map((n) => ({ v: n, label: n + ' 层' }))"
            @update:model-value="(v) => (state.N = v)"
          />
          <p class="hint">{{ nHint }}</p>
        </div>

        <div class="group">
          <div class="group-title"><span class="no">03</span><h2>材料与五金</h2></div>
          <div class="field">
            <div class="field-row"><label>亚克力</label></div>
            <select v-model="state.sheet">
              <option v-for="o in selectOpts(T.SHEETS)" :key="o.v" :value="o.v">{{ o.label }}</option>
            </select>
            <p class="hint">{{ plan.sheet.note }}</p>
          </div>
          <div class="field">
            <div class="field-row"><label>前沿铝梁</label></div>
            <select v-model="state.rail">
              <option v-for="o in selectOpts(T.RAILS)" :key="o.v" :value="o.v">{{ o.label }}</option>
            </select>
            <p class="hint">{{ plan.rail.note }}</p>
          </div>
          <div class="field">
            <div class="field-row"><label>门 / 合页</label></div>
            <select v-model="state.hinge">
              <option v-for="o in selectOpts(T.HINGES)" :key="o.v" :value="o.v">{{ o.label }}</option>
            </select>
            <p class="hint">{{ plan.hinge.note }}</p>
          </div>
          <div class="field">
            <div class="field-row"><label>顶盖</label></div>
            <select v-model="state.lid">
              <option v-for="o in selectOpts(T.LIDS)" :key="o.v" :value="o.v">{{ o.label }}</option>
            </select>
          </div>
          <div class="field">
            <div class="field-row"><label>脚</label></div>
            <select v-model="state.feet">
              <option v-for="o in selectOpts(T.FEETS)" :key="o.v" :value="o.v">{{ o.label }}</option>
            </select>
          </div>
        </div>

        <div v-if="plan.doors" class="group">
          <div class="group-title"><span class="no">04</span><h2>看图角度</h2></div>
          <Seg
            :model-value="state.angle"
            :options="[{ v: 0, label: '关门' }, { v: 35, label: '门开 35°' }, { v: 70, label: '门开 70°' }]"
            @update:model-value="(v) => (state.angle = v)"
          />
          <p class="hint">角度只影响这张正视图，不会存进浏览器。</p>
        </div>

        <div class="group">
          <p class="hint">改任意参数都会自动重算；结果只保存在本机浏览器里，不上传。价格区间随参数变动，下单前建议先做 1 层小样。</p>
        </div>
      </aside>

      <section class="sheet">
        <TabsNav v-model="tab" :tabs="TABS" />

        <div v-if="tab === 'plan'" class="tabpane">
          <StatBar
            :hero="[
              { v: plan.N, label: '层' },
              { v: plan.Wo + '×' + plan.Do, label: '外廓 宽×深' },
              { v: '¥' + plan.total, label: '材料估算' }
            ]"
            :dims="[
              { label: '总高', value: plan.H + ' mm' },
              { label: '单层高', value: plan.Hl + ' mm' },
              { label: '门板', value: plan.doors ? plan.doorW + '×' + plan.doorH : '无门' },
              { label: '整箱重量', value: plan.weight.toFixed(1) + ' kg' }
            ]"
          />
          <p class="explain">{{ plan.explain }}</p>

          <div class="sub">正视图</div>
          <div class="blueprint-frame blueprint">
            <div class="preview" v-html="svg"></div>
          </div>

          <MsgList :warnings="plan.warnings" :notes="plan.notes" />
        </div>

        <div v-else-if="tab === 'cut'" class="tabpane">
          <div class="sub">亚克力切料（给亚克力厂）</div>
          <div class="tableWrap">
            <table>
              <thead><tr><th>部件</th><th class="n">尺寸</th><th class="n">数量</th><th>备注</th></tr></thead>
              <tbody>
                <tr v-for="(c, i) in plan.cutAc" :key="i">
                  <td class="name">{{ c.name }}</td>
                  <td class="n">{{ c.len }} mm</td>
                  <td class="n">{{ c.qty }} 片</td>
                  <td class="spec">{{ c.group }}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr><td colspan="3">切割总长 / 板材面积</td><td class="n">{{ plan.cutAcTotalM.toFixed(2) }} m / {{ plan.area.toFixed(2) }} ㎡</td></tr>
              </tfoot>
            </table>
          </div>
          <p class="hint" style="margin-top: 10px">{{ cutWords }}</p>

          <div class="sub">铝梁切料</div>
          <div class="tableWrap">
            <table>
              <thead><tr><th>部件</th><th class="n">长度</th><th class="n">数量</th><th class="n">合计</th></tr></thead>
              <tbody>
                <tr v-for="(c, i) in plan.cutAl" :key="i">
                  <td class="name">{{ c.name }}</td>
                  <td class="n">{{ c.len }} mm</td>
                  <td class="n">{{ c.qty }} 根</td>
                  <td class="n spec">{{ (c.len * c.qty / 1000).toFixed(2) }} m</td>
                </tr>
              </tbody>
              <tfoot>
                <tr><td colspan="3">铝梁总长</td><td class="n">{{ plan.cutAlTotalM.toFixed(2) }} m</td></tr>
              </tfoot>
            </table>
          </div>
          <p class="hint" style="margin-top: 10px">{{ cutAlWords }}</p>
        </div>

        <div v-else-if="tab === 'bom'" class="tabpane">
          <BomTable
            :rows="bom"
            :total="totals.total"
            :lo="totals.lo"
            :hi="totals.hi"
            :footnote="footnote"
            @copy="copyBom"
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