<script setup>
import { ref, computed, watch } from "vue";
import P from "../cores/planner.js";
import { persisted } from "../lib/store.js";
import { readQuery, copyText, downloadText, docHref } from "../lib/util.js";
import { drawShelf } from "../draw/shelf.js";
import { clampFigure } from "../lib/figures.js";
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
const DEFAULTS = {
  scale: "1:64", mode: "space",
  spaceW: 60, spaceD: 30, spaceH: 55,
  cars: 80, layers: 7,
  spacing: 18, pitchAuto: true, pitch: 60,
  withDoor: true, withLight: true, withBack: false, withSide: false,
  shelfMaterial: "acrylic",
  rod8: false, budget: ""
};
const state = persisted("diy:shelf:v2", DEFAULTS, {
  query: { scale: q.scale, mode: q.mode, spaceW: q.w, spaceD: q.d, spaceH: q.h, cars: q.cars, layers: q.layers, shelfMaterial: q.mat }
});

const tab = ref(["plan", "install", "print", "bom"].includes(q.tab) ? q.tab : "plan");
const TABS = [
  { key: "plan", label: "方案" },
  { key: "install", label: "安装说明" },
  { key: "print", label: "打印" },
  { key: "bom", label: "采购清单" }
];

const plan = computed(() =>
  P.computePlan({
    scale: state.scale, mode: state.mode,
    spaceW: Number(state.spaceW), spaceD: Number(state.spaceD), spaceH: Number(state.spaceH),
    cars: Number(state.cars), layers: Number(state.layers),
    spacing: Number(state.spacing),
    pitch: state.pitchAuto ? "auto" : Number(state.pitch),
    withDoor: !!state.withDoor, withLight: !!state.withLight,
    shelfMaterial: state.shelfMaterial,
    withBack: !!state.withBack, withSide: !!state.withSide,
    rod: state.rod8 ? "8" : "10",
    budget: state.budget === "" || state.budget == null ? null : Number(state.budget)
  })
);

const svg = computed(() => (plan.value.ok ? drawShelf(plan.value, { light: state.withLight, door: state.withDoor }) : ""));
const bom = computed(() => (plan.value.ok ? bomRows(plan.value) : []));
const totals = computed(() => (plan.value.ok ? bomTotals(plan.value) : { total: 0, lo: 0, hi: 0 }));
const steps = computed(() => (plan.value.ok ? normSteps(P.buildSteps(plan.value)) : { intro: "", steps: [], tools: [], pitfalls: [], keyNumbers: [] }));

const layerOpts = computed(() => (plan.value.ok ? plan.value.layersOptions.slice(0, 14) : []));
const maxLayers = computed(() => (plan.value.ok ? Math.max(1, plan.value.maxLayers) : 10));
const perLayerNote = "每层台数已按两侧各 30 mm 让位计算（避开四角 35 mm 缺口）。";

// 手动模式下，层数会被计划结果反向夹到可行范围内
watch(
  () => plan.value,
  (p) => {
    if (p.ok && state.mode === "manual" && Number(state.layers) !== p.layers) state.layers = p.layers;
  }
);

function pickLayers(n) {
  state.mode = "manual";
  state.layers = n;
}

const footnote = computed(() => {
  const p = plan.value;
  if (!p.ok) return "";
  return p.material === "acrylic"
    ? "价格为淘宝/1688 常见区间估算，不含运费；亚克力按「5 mm 浇铸板 + 激光切割 + 热弯」计价。下单前建议先做 1 层小样试装。"
    : "价格为淘宝/1688 常见区间估算，不含运费；层板按 PETG「" + p.printPlan.kg.toFixed(2) + " kg + " + Math.round(p.printPlan.hours) + " 小时」计价（料 65 元/kg），不含电费与你的时间。";
});

const printText = computed(() => {
  const p = plan.value;
  if (!p.ok || !p.printPlan) return "";
  const pp = p.printPlan;
  const L = [];
  L.push("【PETG 打印清单】" + pp.shelf.W + " × " + pp.shelf.D + " mm，每层 " + pp.tiles + " 片，共 " + p.layers + " 层");
  L.push("");
  L.push("· tile_" + (pp.mode === "frame" ? "frame" : "full") + ".stl  " + pp.tw + " × " + pp.td + " × 3 mm  ×" + pp.tilesTotal + " 片（" + pp.tileG + " g/片）");
  L.push("· lip.stl      " + pp.tw + " × 3 × 15 mm        ×" + pp.lipsTotal + " 条");
  L.push("· splice.stl   60 × 18 × 1.8 mm      ×" + pp.splicesTotal + " 片");
  L.push("· coupon.stl   40 × 40 mm            ×1（先打，调透明度）");
  L.push("");
  L.push("合计：" + pp.kg.toFixed(2) + " kg，约 " + Math.round(pp.hours) + " 小时，料钱 ≈" + Math.round(pp.filamentCost) + " 元");
  if (pp.mode === "frame") L.push("另需 1.5 mm 透明 PET 片 " + pp.sheetM2.toFixed(2) + " ㎡（≈" + Math.round(pp.sheetCost) + " 元）");
  L.push("");
  L.push("切片参数：烘干 65℃×4h｜层高 0.10｜喷嘴 250/热床 80｜流量 110~115%｜速度 30~40｜填充 100%｜风扇 0~20%｜无支撑｜光面 PEI + 5 mm brim");
  return L.join("\n");
});

const printRows = computed(() => {
  const p = plan.value;
  const pp = p.printPlan;
  if (!p.ok || !pp) return [];
  return [
    ["① 层板瓦片", "tile_" + (pp.mode === "frame" ? "frame" : "full") + ".stl", pp.tw + " × " + pp.td + " × 3 mm", pp.tilesTotal + " 片", pp.tileG + " g/片"],
    ["② 前挡边", "lip.stl", pp.tw + " × 3 × 15 mm", pp.lipsTotal + " 条", pp.lipG + " g"],
    ["③ 拼缝加强片", "splice.stl", "60 × 18 × 1.8 mm", pp.splicesTotal + " 片", pp.spliceG + " g"],
    ["④ 试片", "coupon.stl", "40 × 40 mm", "1 片", "2.2 g"]
  ];
});
const PRINT_PARAMS = [
  ["干燥", "65 ℃ × 4 h（必须，不烘干会满片气泡）"],
  ["层高", "0.10 mm（0.08 更透，0.16 是分界线）"],
  ["温度", "喷嘴 250 ℃ / 热床 80 ℃"],
  ["流量", "110–115 %（轻微过挤是透明的关键）"],
  ["速度", "外墙 30 / 内墙 40 / 填充 50 mm/s"],
  ["填充 / 风扇", "100 % · 风扇 0–20 %"],
  ["支撑", "不需要；光面 PEI + 5 mm brim，冷却后再取"]
];

const printNotes = computed(() => {
  const pp = plan.value.printPlan;
  if (!pp) return [];
  return [
    { type: "tip", text: "先打 1 个 coupon 调参，做到「对着光能认出字」再往下打。" },
    { type: "tip", text: "打 1 片瓦片，量厚度 3.0 ±0.1，看四角有没有翘。" },
    { type: "tip", text: "拼一层 " + pp.tiles + " 片试装，确认刚好落在两根光轴之间，再批量打 " + pp.tilesTotal + " 片。" }
  ];
});
const printWarnings = computed(() => {
  const pp = plan.value.printPlan;
  if (!pp || pp.hours <= 80) return [];
  return ["这个方案要打 " + Math.round(pp.hours) + " 小时（约 " + Math.ceil(pp.hours / 24) + " 天不停机）。嫌久的话：① 层板材料换成「PETG 边框 + 透明片」；② 层数减一两层；③ 亚克力外发切割。"];
});

function switchPetg() {
  state.shelfMaterial = "petg";
  tab.value = "print";
}
function copyBom() { copyText(P.toText(plan.value)); }
function copyKw() {
  copyText(plan.value.lines.map((l) => l.name + "\t" + l.kw + "\t" + l.qty + (l.u || "个") + "\t参考 " + l.lo + "–" + l.hi + " 元/件").join("\n"));
}
function csv() { downloadText("光轴置物架-采购清单.csv", "\ufeff" + P.toCSV(plan.value), "text/csv;charset=utf-8"); }
function reset() { Object.assign(state, DEFAULTS); }
</script>

<template>
  <main class="page">
    <PlanHead no="01" title="光轴展示架 · 层数规划器" lede="输入柜格空间或车模数量，自动算出「搭几层、每层几台、要买什么、大概多少钱」。">
      <a class="btn" :href="docHref('材料清单.md')">材料清单 →</a>
    </PlanHead>

    <div class="planner">
      <aside class="panel">
        <div class="group">
          <div class="group-title"><span class="no">01</span><h2>车模</h2></div>
          <div class="field">
            <div class="field-row"><label>比例</label></div>
            <select v-model="state.scale">
              <option value="1:64">1:64 小车（风火轮 / 火柴盒）</option>
              <option value="1:43">1:43 车模</option>
              <option value="1:24">1:24 大比例</option>
            </select>
          </div>
          <div class="chiprow">
            <button class="chip" @click="[state.spaceW, state.spaceD, state.spaceH] = [60, 30, 55]">桌面 60×30×55</button>
            <button class="chip" @click="[state.spaceW, state.spaceD, state.spaceH] = [80, 35, 70]">书柜格 80×35×70</button>
            <button class="chip" @click="[state.spaceW, state.spaceD, state.spaceH] = [120, 40, 120]">整面墙 120×40×120</button>
          </div>
        </div>

        <div class="group">
          <div class="group-title"><span class="no">02</span><h2>怎么定层数</h2></div>
          <Seg
            :model-value="state.mode"
            :options="[{ v: 'space', label: '按空间' }, { v: 'cars', label: '按车数' }, { v: 'manual', label: '手动' }]"
            @update:model-value="(v) => (state.mode = v)"
          />
          <FieldNum v-if="state.mode === 'cars'" v-model="state.cars" label="想放多少台" :min="1" :max="999" unit="台" />
          <FieldNum
            v-if="state.mode === 'manual'"
            v-model="state.layers"
            label="层数"
            :min="1"
            :max="maxLayers"
            unit="层"
            slider
            :slider-min="1"
            :slider-max="maxLayers"
          />
          <p class="hint" v-if="plan.ok">{{ plan.reason }}</p>
        </div>

        <div class="group">
          <div class="group-title"><span class="no">03</span><h2>可用空间（柜格内空）</h2></div>
          <FieldNum v-model="state.spaceW" label="宽" :min="20" :max="300" unit="cm" slider :slider-min="20" :slider-max="200" />
          <FieldNum v-model="state.spaceD" label="深" :min="15" :max="200" unit="cm" slider :slider-min="15" :slider-max="100" />
          <FieldNum v-model="state.spaceH" label="高" :min="20" :max="300" unit="cm" slider :slider-min="20" :slider-max="200" />
        </div>

        <div class="group">
          <div class="group-title"><span class="no">04</span><h2>配置</h2></div>
          <div class="field">
            <div class="field-row"><label>层板材料</label></div>
            <select v-model="state.shelfMaterial">
              <option value="acrylic">亚克力（激光切割）</option>
              <option value="petg">PETG 3D 打印（整片）</option>
              <option value="petg_frame">PETG 边框 + 透明片</option>
            </select>
          </div>
          <div class="toggles">
            <label class="toggle"><input type="checkbox" v-model="state.withDoor" />前门</label>
            <label class="toggle"><input type="checkbox" v-model="state.withLight" />顶部灯盒</label>
            <label class="toggle"><input type="checkbox" v-model="state.withBack" />背板</label>
            <label class="toggle"><input type="checkbox" v-model="state.withSide" />侧板</label>
            <label class="toggle"><input type="checkbox" v-model="state.rod8" />光轴用 φ8</label>
          </div>
        </div>

        <div class="group">
          <div class="group-title"><span class="no">05</span><h2>高级参数</h2></div>
          <FieldNum v-model="state.spacing" label="车位间距" :min="0" :max="60" unit="mm" slider :slider-min="0" :slider-max="60" />
          <label class="toggle" style="margin-bottom: 10px"><input type="checkbox" v-model="state.pitchAuto" />层距自动</label>
          <FieldNum v-if="!state.pitchAuto" v-model="state.pitch" label="固定层距" :min="45" :max="160" :step="5" unit="mm" />
          <FieldNum v-model="state.budget" label="预算上限（可空）" :min="0" :max="99999" :step="50" unit="元" placeholder="不限" />
        </div>

        <div class="group">
          <p class="hint">改任意参数都会自动重算；结果只保存在本机浏览器里，不上传。</p>
        </div>
      </aside>

      <section class="sheet">
        <TabsNav v-model="tab" :tabs="TABS" />

        <div v-if="!plan.ok" class="tabpane">
          <div class="errbox">
            <strong>这个空间放不下</strong>
            <p>{{ plan.error }}</p>
            <p>试试：换更小比例的车模、把宽度 / 高度设大一点，或减少每层车位数。</p>
          </div>
        </div>

        <template v-else>
          <div v-if="tab === 'plan'" class="tabpane">
            <StatBar
              :hero="[
                { v: plan.layers, label: '层' },
                { v: plan.perLayer, label: '台 / 层' },
                { v: plan.capacity, label: '总容量（台）' }
              ]"
              :dims="[
                { label: '外廓 宽×深×高', value: plan.frame.W + '×' + plan.frame.D + '×' + plan.frame.H },
                { label: '立柱（φ 光轴）', value: plan.frame.uprightLen + ' mm' },
                { label: '横杆长度', value: plan.frame.rodLen + ' mm' },
                { label: '层板', value: plan.frame.shelfW + '×' + plan.frame.shelfD }
              ]"
            />
            <p class="explain">{{ plan.explain }}</p>
            <p class="hint">{{ perLayerNote }}</p>

            <div v-if="plan.printPlan" class="pstrip">
              <b>层板：{{ plan.printPlan.mode === 'frame' ? 'PETG 边框 + 透明片' : 'PETG 整片打印' }}</b>
              <span>· {{ plan.printPlan.tilesTotal }} 片 · {{ plan.printPlan.kg.toFixed(2) }} kg · ≈{{ Math.round(plan.printPlan.hours) }} 小时</span>
              <span class="sp"></span>
              <span>料钱 ≈{{ Math.round(plan.printPlan.filamentCost) }} 元</span>
            </div>

            <div class="sub">正视图</div>
            <div class="blueprint-frame blueprint">
              <div class="preview">
                <svg viewBox="0 0 400 300" role="img" aria-label="架子正视图预览" v-html="svg"></svg>
              </div>
            </div>

            <div class="sub">换成别的层数看看</div>
            <div class="chiprow">
              <button
                v-for="o in layerOpts"
                :key="o.layers"
                class="chip"
                :class="{ on: o.layers === plan.layers }"
                :title="'高度约 ' + o.height + ' mm'"
                @click="pickLayers(o.layers)"
              >
                {{ o.layers }} 层<small>{{ o.capacity }} 台</small>
              </button>
            </div>

            <MsgList :warnings="plan.warnings" :notes="plan.notes" />
          </div>

          <div v-else-if="tab === 'install'" class="tabpane">
            <StepsList :intro="steps.intro" :steps="steps.steps" :tools="steps.tools" :pitfalls="steps.pitfalls" />
            <figure class="fig" v-html="clampFigure"></figure>
            <div class="acts"><a class="btn" :href="docHref('材料清单.md')">装配细节看材料清单 →</a></div>
          </div>

          <div v-else-if="tab === 'print'" class="tabpane">
            <template v-if="plan.printPlan">
              <p class="explain">
                层板 {{ plan.printPlan.shelf.W }} × {{ plan.printPlan.shelf.D }} mm，按 {{ plan.printPlan.bed }} mm 热床拆成
                {{ plan.printPlan.cols }} × {{ plan.printPlan.rows }} 片，每片 {{ plan.printPlan.tw }} × {{ plan.printPlan.td }} mm。
                打印时光滑面贴床、筋朝上，翻过来就是放车面。
              </p>
              <p class="hint" v-if="plan.printPlan.plates > 1">
                按 {{ plan.printPlan.bed }} mm 幅面，<b>一床只能放 {{ plan.printPlan.perPlate }} 片</b>，所以是
                <b>{{ plan.printPlan.plates }} 盘</b>（{{ plan.printPlan.tilesTotal }} 片）——上料、等冷却、取件也要算进时间里。
              </p>
              <StatBar
                :dims="[
                  { label: '总片数', value: plan.printPlan.tilesTotal + ' 片' },
                  { label: '耗材', value: plan.printPlan.kg.toFixed(2) + ' kg' },
                  { label: '预计时间', value: '≈' + Math.round(plan.printPlan.hours) + ' h' },
                  { label: '料钱', value: '≈' + Math.round(plan.printPlan.filamentCost) + ' 元' },
                  { label: '每片', value: plan.printPlan.tw + '×' + plan.printPlan.td },
                  { label: '每层', value: plan.printPlan.tiles + ' 片' }
                ]"
              />
              <p class="hint" v-if="plan.printPlan.mode === 'frame'">
                边框方案还要配 1.5 mm 透明 PET 片 {{ plan.printPlan.sheetM2.toFixed(2) }} ㎡（约 {{ Math.round(plan.printPlan.sheetCost) }} 元），粘在框上。
              </p>

              <div class="sub">要打的件</div>
              <div class="tableWrap">
                <table>
                  <thead><tr><th>件</th><th>文件</th><th>尺寸</th><th class="n">总数量</th><th class="n">单件</th></tr></thead>
                  <tbody>
                    <tr v-for="(r, i) in printRows" :key="i">
                      <td class="name">{{ r[0] }}</td>
                      <td class="spec"><code>{{ r[1] }}</code></td>
                      <td class="spec">{{ r[2] }}</td>
                      <td class="n">{{ r[3] }}</td>
                      <td class="n">{{ r[4] }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div class="sub">切片参数（透明 PETG）</div>
              <div class="tableWrap">
                <table>
                  <tbody>
                    <tr v-for="(p, i) in PRINT_PARAMS" :key="i">
                      <td class="name" style="width: 120px">{{ p[0] }}</td>
                      <td class="spec">{{ p[1] }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div class="sub">开工顺序</div>
              <MsgList :warnings="printWarnings" :notes="printNotes" />

              <div class="acts">
                <button class="btn primary" @click="copyText(printText)">复制打印清单</button>
                <a class="btn" :href="'./petg/stl/tile_' + (plan.printPlan.mode === 'frame' ? 'frame' : 'full') + '.stl'" download>下载瓦片 STL</a>
                <a class="btn" :href="docHref('打印说明.md')">打开打印说明</a>
              </div>
            </template>

            <template v-else>
              <div class="errbox">
                <strong>当前层板是「亚克力激光切割」，用不上打印机</strong>
                <p>把「层板材料」切成 PETG，这里会算出：拆成几片、每片多大、多少克、打多久，以及切片参数。</p>
              </div>
              <div class="acts"><button class="btn primary" @click="switchPetg">切换到 PETG 打印</button></div>
              <p class="hint">打印件和亚克力件不通用：打印版层板比外框内缩，四角不用开缺口；文档与 STL 在 petg/ 目录。</p>
            </template>
          </div>

          <div v-else class="tabpane">
            <BomTable
              :rows="bom"
              :total="totals.total"
              :lo="totals.lo"
              :hi="totals.hi"
              :budget="state.budget === '' || state.budget == null ? null : Number(state.budget)"
              :footnote="footnote"
              @copy="copyBom"
              @copykw="copyKw"
              @csv="csv"
              @reset="reset"
            />
          </div>
        </template>
      </section>
    </div>
  </main>
</template>