<script setup>
import { computed } from "vue";
import { ROUTES, route } from "./router.js";
import HomeView from "./views/HomeView.vue";
import ShelfView from "./views/ShelfView.vue";
import CabinetView from "./views/CabinetView.vue";
import TrayView from "./views/TrayView.vue";
import DisplayView from "./views/DisplayView.vue";

const VIEWS = {
  home: HomeView,
  shelf: ShelfView,
  cabinet: CabinetView,
  tray: TrayView,
  display: DisplayView
};

const current = computed(() => VIEWS[route.name] || HomeView);
const navs = ROUTES.filter((r) => r.nav);
</script>

<template>
  <header class="topbar">
    <div class="topbar-inner">
      <a class="brand" href="#/">
        <span class="brand-mark"><i></i><i></i><i></i></span>
        <span>
          <span class="brand-name">自制家具</span>
          <span class="brand-sub">blueprint desk</span>
        </span>
      </a>
      <nav class="topnav">
        <a v-for="r in navs" :key="r.path" :href="'#' + r.path" :class="{ on: route.path === r.path }">
          <span style="opacity: 0.55">{{ r.no }}</span> {{ r.nav }}
        </a>
      </nav>
      <div class="topbar-right">
        <span class="stamp">免打孔 · 图纸版</span>
      </div>
    </div>
  </header>

  <transition name="fade" mode="out-in">
    <component :is="current" :key="route.path" />
  </transition>

  <footer class="colophon">
    <span class="mono">自制家具 · 图纸与规划器</span>
    <span>价格都是淘宝 / 1688 的常见区间估算，不含运费；下单前建议先做 1 件小样试装。</span>
    <span class="mono" style="margin-left: auto">MIT · 参数只存在本机浏览器</span>
  </footer>
</template>