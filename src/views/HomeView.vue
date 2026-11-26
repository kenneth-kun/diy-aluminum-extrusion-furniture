<script setup>
import { ref, computed } from "vue";
import { SCHEMES, DOC_GROUPS } from "../data/schemes.js";
import PlateCard from "../components/PlateCard.vue";

const q = ref("");

const kw = computed(() => q.value.trim().toLowerCase());

const schemes = computed(() => {
  if (!kw.value) return SCHEMES;
  return SCHEMES.filter((s) =>
    (s.title + s.tag + s.kind + s.blurb + s.keys + s.cost).toLowerCase().includes(kw.value)
  );
});

const groups = computed(() =>
  DOC_GROUPS.map((g) => ({
    ...g,
    items: kw.value ? g.items.filter((it) => (it.label + it.what + it.keys).toLowerCase().includes(kw.value)) : g.items
  })).filter((g) => g.items.length)
);

const total = computed(() => schemes.value.length + groups.value.reduce((n, g) => n + g.items.length, 0));
</script>

<template>
  <main class="page">
    <section class="masthead">
      <div class="masthead-top">
        <h1>四套<em>免打孔</em>自制家具<br />和它们的<em>尺寸算法</em></h1>
        <span class="head-no" style="align-self: flex-start">图纸索引 2025</span>
      </div>
      <p class="lede">
        不做木工、不焊接、不在墙上打孔：光轴 + 十字夹、铝型材 + T 螺母、亚克力 + 合页。
        每一套都能改尺寸重算——切料表、五金清单、造价区间、装配顺序一起出来。
      </p>
      <div class="masthead-meta">
        <span>方案 <b>04</b></span>
        <span>总造价 <b>¥303 – ¥1217</b></span>
        <span>最短工期 <b>1.5 h</b></span>
        <span>许可证 <b>MIT</b></span>
      </div>
      <div class="searchbar">
        <input v-model="q" type="search" placeholder="搜：抽屉柜 / 手办 / 合页 / 端盖 / 尺寸" aria-label="搜索方案与资料" />
        <span class="count">{{ total }} 项</span>
      </div>
    </section>

    <div v-if="schemes.length" class="plates">
      <PlateCard v-for="s in schemes" :key="s.id" :s="s" />
    </div>

    <section v-for="g in groups" :key="g.title" class="index-block">
      <h2>{{ g.title }}</h2>
      <ul class="index-list">
        <li v-for="it in g.items" :key="it.label">
          <a :href="it.href">
            <span class="idx">▸</span>
            <span>{{ it.label }}</span>
            <span class="what">{{ it.what }}</span>
          </a>
        </li>
      </ul>
    </section>

    <p v-if="!total" class="errbox" style="margin-top: 28px">没找到「{{ q }}」。试试「抽屉柜」「展示盒」「合页」「端盖」这些词。</p>
  </main>
</template>