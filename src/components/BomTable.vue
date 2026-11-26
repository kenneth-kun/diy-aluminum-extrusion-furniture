<script setup>
/* 采购清单表：材料 / 规格 / 数量 / 金额 / 三平台比价 + 合计条 + 动作按钮 */
import { computed } from "vue";
import { buyUrl, SITES, money } from "../lib/util.js";

const props = defineProps({
  rows: { type: Array, required: true },
  total: { type: Number, required: true },
  lo: { type: Number, default: 0 },
  hi: { type: Number, default: 0 },
  budget: { type: [Number, String], default: "" },
  footnote: { type: String, default: "" },
  showKw: { type: Boolean, default: true }
});
const emit = defineEmits(["copy", "copykw", "csv", "reset"]);

const budgetState = computed(() => {
  const b = props.budget;
  if (b === "" || b == null || !isFinite(Number(b)) || Number(b) <= 0) return null;
  const diff = Number(b) - props.total;
  return diff >= 0
    ? { ok: true, text: "预算内，还剩约 " + Math.round(diff) + " 元" }
    : { ok: false, text: "超出预算约 " + Math.round(-diff) + " 元" };
});
</script>

<template>
  <div>
    <div class="sub">要买的东西</div>
    <div class="tableWrap">
      <table>
        <thead>
          <tr>
            <th>材料</th>
            <th>规格</th>
            <th class="n" style="text-align: right">数量</th>
            <th class="n" style="text-align: right">≈金额</th>
            <th v-if="showKw" class="n" style="text-align: right">搜同款比价</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(r, i) in rows" :key="i">
            <td class="name">{{ r.name }}</td>
            <td class="spec">
              {{ r.spec }}
              <div v-if="r.note" class="band">{{ r.note }}</div>
            </td>
            <td class="n" style="text-align: right">{{ r.qty || "—" }}</td>
            <td class="n" style="text-align: right">
              {{ money(r.amount) }}
              <br /><small class="band">单件 {{ r.lo }}–{{ r.hi }}</small>
            </td>
            <td v-if="showKw" class="n">
              <div class="buylinks">
                <a
                  v-for="s in SITES"
                  :key="s.key"
                  :href="buyUrl(r.kw, s.key)"
                  target="_blank"
                  rel="noopener"
                  :title="s.label + ' 搜「' + r.kw + '」'"
                  >{{ s.label }}</a
                >
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="totalbar">
      <div>
        <b>{{ money(total) }}</b>
        <span class="range">区间 {{ lo }}–{{ hi }} 元（不含运费）</span>
      </div>
      <span class="spacer"></span>
      <div v-if="budgetState" :style="{ color: budgetState.ok ? 'var(--ok)' : 'var(--danger)', fontFamily: 'var(--mono)', fontSize: '12px' }">
        {{ budgetState.ok ? "✓ " : "✗ " }}{{ budgetState.text }}
      </div>
    </div>

    <div class="acts">
      <button class="btn btn-solid" @click="emit('copy')">复制清单</button>
      <button v-if="showKw" class="btn" @click="emit('copykw')">复制搜价关键词</button>
      <button class="btn" @click="emit('csv')">下载 CSV</button>
      <button class="btn btn-quiet" @click="emit('reset')">重置参数</button>
    </div>
    <p v-if="footnote" class="footnote">{{ footnote }}</p>
  </div>
</template>