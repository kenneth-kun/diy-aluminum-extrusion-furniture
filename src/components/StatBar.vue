<script setup>
/* 大数字三联 + 四联尺寸（可任选其一/都有） */
defineProps({
  hero: { type: Array, default: () => [] }, // [{ v, unit, label }]
  dims: { type: Array, default: () => [] } // [{ label, value }]
});
</script>

<template>
  <div>
    <div v-if="hero.length" class="hero3">
      <div v-for="(h, i) in hero" :key="i">
        <b>{{ h.v }}</b>
        <span>{{ h.label }}</span>
      </div>
    </div>
    <div v-if="dims.length" class="stat4">
      <div v-for="(d, i) in dims" :key="i">
        <span>{{ d.label }}</span>
        <b>{{ d.value }}</b>
      </div>
    </div>
  </div>
</template>