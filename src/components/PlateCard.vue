<script setup>
/* 首页方案卡：编号 + 缩略图 + 标题 + 三格关键数字 + 两个动作 */
defineProps({ s: { type: Object, required: true } });
</script>

<template>
  <article class="plate">
    <div class="plate-top">
      <span class="plate-no">图 {{ s.no }}</span>
      <span class="plate-kind">{{ s.kind }}</span>
      <span class="plate-price">{{ s.cost }}</span>
    </div>
    <a class="plate-thumb" :href="s.href" :aria-label="s.title + ' 规划器'">
      <img :src="s.thumb" :alt="s.title + ' 界面预览'" loading="lazy" />
    </a>
    <div class="plate-main">
      <h3>{{ s.title }} <span style="font-family: var(--mono); font-size: 11px; color: var(--text-3)">{{ s.tag }}</span></h3>
      <p>{{ s.blurb }}</p>
      <div class="plate-specs">
        <div v-for="(x, i) in s.specs" :key="i">
          <span>{{ x.k }}</span>
          <b>{{ x.v }}</b>
        </div>
      </div>
      <div class="plate-actions">
        <a class="btn btn-copper" :href="s.href">打开规划器</a>
        <a class="btn" :href="'./docs/' + s.doc">{{ s.docLabel }}</a>
      </div>
    </div>
  </article>
</template>