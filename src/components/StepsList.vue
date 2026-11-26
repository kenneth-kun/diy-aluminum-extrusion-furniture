<script setup>
/* 装配：步骤 + 工具 + 坑 */
defineProps({
  intro: { type: String, default: "" },
  steps: { type: Array, default: () => [] },
  tools: { type: Array, default: () => [] },
  pitfalls: { type: Array, default: () => [] }
});
</script>

<template>
  <div>
    <p v-if="intro" class="explain">{{ intro }}</p>

    <div class="sub">装配顺序</div>
    <ol class="steps">
      <li v-for="s in steps" :key="s.n" class="step">
        <div class="step-no">STEP {{ String(s.n).padStart(2, "0") }}</div>
        <div>
          <h3>{{ s.title }}</h3>
          <p>{{ s.desc }}</p>
          <p v-if="s.check" class="check">{{ s.check }}</p>
        </div>
      </li>
    </ol>

    <div v-if="tools.length" class="sub">工具</div>
    <div v-if="tools.length" class="toolbar-list">
      <span v-for="(t, i) in tools" :key="i" :title="t.note || ''">
        {{ t.name }}<template v-if="t.note"> · {{ t.note }}</template>
      </span>
    </div>

    <div v-if="pitfalls.length" class="pitfalls">
      <h3>别踩这几个坑</h3>
      <ul>
        <li v-for="(p, i) in pitfalls" :key="i">
          <b v-if="p.title">{{ p.title }}：</b>{{ p.text }}
        </li>
      </ul>
    </div>
  </div>
</template>