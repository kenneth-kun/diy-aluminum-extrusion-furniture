<script setup>
/* 提示区：warnings（字符串数组）+ notes（{ type, text }） */
import { computed } from "vue";

const props = defineProps({
  warnings: { type: Array, default: () => [] },
  notes: { type: Array, default: () => [] }
});

const list = computed(() => {
  const out = props.warnings.map((w) => ({ type: "warn", text: w }));
  props.notes.forEach((n) => {
    const t = n && n.type ? n.type : "info";
    out.push({ type: t === "tip" ? "tip" : t === "warn" ? "warn" : "info", text: n && n.text ? n.text : String(n) });
  });
  return out;
});
</script>

<template>
  <div v-if="list.length" class="msgs">
    <div v-for="(m, i) in list" :key="i" class="msg" :class="m.type">{{ m.text }}</div>
  </div>
</template>