<script setup>
/* 数值输入：number 框 + 可选 range 滑块（同步），失焦/change 时才夹到范围内，
   避免打字打到一半被改值 */
const props = defineProps({
  modelValue: { type: Number, required: true },
  label: { type: String, default: "" },
  min: { type: Number, default: null },
  max: { type: Number, default: null },
  step: { type: Number, default: 1 },
  unit: { type: String, default: "" },
  slider: { type: Boolean, default: true },
  sliderMin: { type: Number, default: null },
  sliderMax: { type: Number, default: null },
  hint: { type: String, default: "" }
});
const emit = defineEmits(["update:modelValue"]);

function clamp(v) {
  let x = v;
  if (props.min != null) x = Math.max(props.min, x);
  if (props.max != null) x = Math.min(props.max, x);
  return x;
}
function onInput(e) {
  const v = Number(e.target.value);
  if (!isFinite(v)) return;
  emit("update:modelValue", v);
}
function onCommit(e) {
  const v = Number(e.target.value);
  emit("update:modelValue", isFinite(v) ? clamp(v) : props.modelValue);
}
</script>

<template>
  <div class="field">
    <div class="field-row">
      <label v-if="label">{{ label }}</label>
      <div class="num">
        <input
          type="number"
          :value="modelValue"
          :min="min"
          :max="max"
          :step="step"
          inputmode="decimal"
          @input="onInput"
          @change="onCommit"
          @blur="onCommit"
        />
        <span v-if="unit" class="unit">{{ unit }}</span>
      </div>
    </div>
    <input
      v-if="slider"
      type="range"
      :value="modelValue"
      :min="sliderMin != null ? sliderMin : min"
      :max="sliderMax != null ? sliderMax : max"
      :step="step"
      @input="onInput"
    />
    <p v-if="hint" class="hint">{{ hint }}</p>
  </div>
</template>