<script setup>
/* 页签条：tabs = [{ key, label }] */
defineProps({
  tabs: { type: Array, required: true },
  modelValue: { type: String, required: true }
});
const emit = defineEmits(["update:modelValue"]);
</script>

<template>
  <div class="tabs" role="tablist">
    <button
      v-for="t in tabs"
      :key="t.key"
      type="button"
      role="tab"
      :aria-selected="modelValue === t.key"
      :class="{ on: modelValue === t.key }"
      @click="emit('update:modelValue', t.key)"
    >
      {{ t.label }}
    </button>
  </div>
</template>