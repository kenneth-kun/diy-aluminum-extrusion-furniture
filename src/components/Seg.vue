<script setup>
/* 分段选择（2–4 个互斥选项） */
defineProps({
  modelValue: { type: [String, Number], required: true },
  options: { type: Array, required: true } // [{ v, label }]
});
const emit = defineEmits(["update:modelValue"]);
</script>

<template>
  <div class="seg">
    <button
      v-for="o in options"
      :key="o.v"
      type="button"
      :class="{ on: modelValue === o.v }"
      @click="emit('update:modelValue', o.v)"
    >
      {{ o.label }}
    </button>
  </div>
</template>