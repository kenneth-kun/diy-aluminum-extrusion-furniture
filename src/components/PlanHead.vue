<script setup>
/* 页面标题区：图纸编号 + 标题 + 一句话 + 右侧动作（slot） */
defineProps({
  no: { type: String, default: "" },
  title: { type: String, required: true },
  lede: { type: String, default: "" }
});
</script>

<template>
  <div class="head">
    <span v-if="no" class="head-no">图纸 {{ no }}</span>
    <div>
      <h1>{{ title }}</h1>
      <p v-if="lede" class="lede">{{ lede }}</p>
    </div>
    <div class="head-actions"><slot /></div>
  </div>
</template>