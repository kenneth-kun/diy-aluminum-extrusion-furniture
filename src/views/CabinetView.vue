<script setup>
import { ref, computed } from "vue";
import C from "../cores/cabinet.js";
import { persisted } from "../lib/store.js";
import { readQuery, copyText, downloadText, docHref } from "../lib/util.js";
import { drawCabinet } from "../draw/cabinet.js";
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
const DEFAULTS = { W: 450, D: 400, H: 760, N: 4, prof: "3030", panel: "flute", top: "steel", feet: "caster", capFix: "press" };
const state = persisted("diy:cabinet:v2", DEFAULTS, {
  query: { W: q.w ? Number(q.w) * 10 : undefined, D: q.d ? Number(q.d) * 10 : undefined, H: q.h ? Number(q.h) * 10 : undefined, N: q.n ? Number(q.n) : undefined, prof: q.prof, panel: q.panel, top: q.top, feet: q.feet, capFix: q.capFix }
});

const tab = ref(["plan", "cut", "bom", "install"].includes(q.tab) ? q.tab : "plan");
const TABS = [
  { key: "plan", label: "设计" },
  { key: "cut", label: "切料表" },
  { key: "bom", label: "采购" },
  { key: "install", label: "装配" }
];

const plan = computed(() => C.computeCabinet(state));
const svg = computed(() => drawCabinet(plan.value));
const bom = computed(() => bomRows(plan.value));
const totals = computed(() => bomTotals(plan.value));
const steps = computed(() => normSteps(C.buildSteps(plan.value)));
const opts = (map) => Object.entries(map).map(([v, o]) => ({ v, label: o.label }));

const hdHint = computed(() => {
  const p = plan.value;
  return "单抽净高 " + p.dims.Hd + " mm" + (p.dims.Hd < 100 ? "（偏矮，放不进高瓶罐）" : "，能竖放 A4 文件 / 高瓶");
});
const tapWords = computed(() => {
  const p = plan.value;
  return p.capHoles ? "端面攻 M4 螺纹（共 " + p.capHoles + " 孔）" : p.capFix === "selftap" ? "两端不攻丝（用自攻钉）" : "两端不攻丝";
});
const capLine = computed(() => {
  const p = plan.value;
  return "端盖：" + p.capCount + " 个 · " + p.capLabel + (p.capHoles ? "，需攻丝 " + p.capHoles + " 孔（卖家可代攻，约 1.2 元/孔）" : "，直接压入端面");
});
const footnote = "价格为淘宝 / 1688 常见区间估算，不含运费；不锈钢台面按「1.2 mm 304 拉丝 + 折边」计价，多层板按「18 mm + 封边」计价。";

const presets = [
  { label: "床头柜 40×35×55", v: [400, 350, 550] },
  { label: "边柜 45×40×76", v: [450, 400, 760] }
];
function applyPreset(v) { state.W = v[0]; state.D = v[1]; state.H = v[2]; }

function copyAll() { copyText(C.toText(plan.value)); }
function copyKw() {
  copyText(plan.value.lines.map((l) => l.name + "\t" + l.kw + "\t" + l.spec).join("\n"));
}
function csv() { downloadText("铝型材柜-切料清单.csv", "\ufeff" + C.toCSV(plan.value), "text/csv;charset=utf-8"); }
function reset() { Object.assign(state, DEFAULTS); }
</script>

<template>
  <main class="page">
    <PlanHead no="02" title="铝型材抽屉柜 · 切料规划器" lede="4 根 3030 立柱 + 2020 自成抽屉框，三节钢珠导轨上立柱，长虹纹亚克力面板滑进型材槽——不打孔、不焊接。">
      <a class="btn" :href="docHref('铝型材柜.md')">说明书 →</a>
    </PlanHead>

    <div class="planner">
      <aside class="panel">
        <div class="group">
          <div class="group-title"><span class="no">01</span><h2>柜体尺寸</h2></div>
          <FieldNum v-model="state.W" label="外宽" :min="25" :max="90" unit="cm" :slider-min="25" :slider-max="80" />
          <FieldNum v-model="state.D" label="外深" :min="20" :max="60" unit="cm" :slider-min="20" :slider-max="55" />
          <FieldNum v-model="state.H" label="总高（含脚）" :min="30" :max="110" unit="cm" :slider-min="30" :slider-max="100" />
          <div class="chiprow wrap">
            <button v-for="(p, i) in presets" :key="i" class="chip" @click="applyPreset(p.v)">{{ p.label }}</button>
          </div>
        </div>

        <div class="group">
          <div class="group-title"><span class="no">02</span><h2>抽屉</h2></div>
          <Seg
            :model-value="state.N"
            :options="[2, 3, 4, 5, 6].map((n) => ({ v: n, label: n + ' 抽' }))"
            @update:model-value="(v) => (state.N = v)"
          />
          <p class="hint">{{ hdHint }}</p>
        </div>

        <div class="group">
          <div class="group-title"><span class="no">03</span><h2>型材与面板</h2></div>
          <div class="field">
            <div class="field-row"><label>柜体型材</label></div>
            <select v-model="state.prof">
              <option v-for="o in opts(C.PROFILES)" :key="o.v" :value="o.v">{{ o.label }}</option>
            </select>
          </div>
          <div class="field">
            <div class="field-row"><label>抽屉面板</label></div>
            <select v-model="state.panel">
              <option v-for="o in opts(C.PANELS)" :key="o.v" :value="o.v">{{ o.label }}</option>
            </select>
          </div>
        </div>

        <div class="group">
          <div class="group-title"><span class="no">04</span><h2>台面 / 脚 / 端盖</h2></div>
          <div class="field">
            <div class="field-row"><label>台面</label></div>
            <select v-model="state.top">
              <option v-for="o in opts(C.TOPS)" :key="o.v" :value="o.v">{{ o.label }}</option>
            </select>
            <p class="hint">{{ C.TOPS[plan.input.top] ? C.TOPS[plan.input.top].note : '' }}</p>
          </div>
          <div class="field">
            <div class="field-row"><label>脚</label></div>
            <select v-model="state.feet">
              <option v-for="o in opts(C.FEETS)" :key="o.v" :value="o.v">{{ o.label }}</option>
            </select>
          </div>
          <div class="field">
            <div class="field-row"><label>端盖固定</label></div>
            <select v-model="state.capFix">
              <option v-for="o in opts(C.CAPFIX)" :key="o.v" :value="o.v">{{ o.label }}</option>
            </select>
            <p class="hint">{{ plan.capNote }}</p>
          </div>
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
              { v: plan.dims.drawerN, label: '抽屉' },
              { v: plan.dims.Hd + ' mm', label: '单抽净高' },
              { v: '¥' + plan.total, label: '材料估算' }
            ]"
            :dims="[
              { label: '内空 宽×深×高', value: plan.dims.Wi + '×' + plan.dims.Di + '×' + plan.dims.Hi },
              { label: '抽屉 宽×深', value: plan.dims.WD + '×' + plan.dims.DD },
              { label: '导轨', value: (plan.dims.slide || '定制') + ' mm' },
              { label: '切料总长', value: plan.cutTotalM.toFixed(2) + ' m' }
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
            下单话术：「{{ C.PROFILES[plan.input.prof].label }} 切割：按上表长度，<span>{{ tapWords }}</span>，切口去毛刺」。
          </p>
          <p class="hint">{{ capLine }}</p>

          <div class="sub">面板与板材</div>
          <div class="tableWrap">
            <table>
              <thead><tr><th>部件</th><th class="n">尺寸</th><th class="n">数量</th><th>材料</th></tr></thead>
              <tbody>
                <tr v-for="(x, i) in plan.panels" :key="i">
                  <td class="name">{{ x.name }}</td>
                  <td class="n">{{ x.w }} × {{ x.h }} mm</td>
                  <td class="n">{{ x.qty }} 块</td>
                  <td class="spec">{{ x.mat }}</td>
                </tr>
              </tbody>
              <tfoot><tr><td colspan="3">板材面积</td><td class="n">{{ plan.panelArea.toFixed(2) }} ㎡</td></tr></tfoot>
            </table>
          </div>
          <p class="hint" style="margin-top: 10px">
            下单话术：「{{ C.PANELS[plan.input.panel].label }}，按上表尺寸切割，四边倒角；长虹纹横纹朝上」。
          </p>
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