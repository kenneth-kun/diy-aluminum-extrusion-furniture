/* 极简 hash 路由：#/shelf、#/cabinet?w=45 …（file:// 双击也能用，不需要服务端） */
import { reactive, computed } from "vue";

export const ROUTES = [
  { path: "/", name: "home", title: "自制家具 · 图纸与规划器", nav: null, no: "索引" },
  { path: "/shelf", name: "shelf", title: "光轴展示架 · 层数规划器｜自制家具", nav: "光轴展示架", no: "01" },
  { path: "/cabinet", name: "cabinet", title: "铝型材抽屉柜 · 切料规划器｜自制家具", nav: "抽屉柜", no: "02" },
  { path: "/tray", name: "tray", title: "桌面收纳柜 · 盆位规划器｜自制家具", nav: "桌面柜", no: "03" },
  { path: "/display", name: "display", title: "亚克力展示盒 · 悬停面板｜自制家具", nav: "展示盒", no: "04" }
];

function parse(hash) {
  const raw = (hash || "").replace(/^#/, "");
  const [pathPart, queryPart] = raw.split("?");
  const path = "/" + (pathPart || "").replace(/^\/+/, "").replace(/\/+$/, "");
  const query = {};
  (queryPart || "").split("&").forEach((kv) => {
    if (!kv) return;
    const i = kv.indexOf("=");
    const k = i < 0 ? kv : kv.slice(0, i);
    const v = i < 0 ? "" : kv.slice(i + 1);
    try { query[decodeURIComponent(k)] = decodeURIComponent(v); } catch (e) { /* 忽略坏参数 */ }
  });
  const hit = ROUTES.find((r) => r.path === path) || ROUTES[0];
  return { path: hit.path, name: hit.name, query };
}

export const route = reactive(parse(location.hash));

export function initRouter() {
  applyTitle();
  window.addEventListener("hashchange", () => {
    const next = parse(location.hash);
    route.path = next.path;
    route.name = next.name;
    route.query = next.query;
    applyTitle();
    window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
  });
}

function applyTitle() {
  const hit = ROUTES.find((r) => r.path === route.path) || ROUTES[0];
  document.title = hit.title;
}

export const current = computed(() => ROUTES.find((r) => r.path === route.path) || ROUTES[0]);

export function to(path, query) {
  let h = "#" + path;
  if (query) {
    const qs = Object.keys(query)
      .filter((k) => query[k] !== undefined && query[k] !== "" && query[k] !== null)
      .map((k) => encodeURIComponent(k) + "=" + encodeURIComponent(query[k]))
      .join("&");
    if (qs) h += "?" + qs;
  }
  location.hash = h;
}