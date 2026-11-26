/* 参数状态：reactive + 本机 localStorage 持久化（不上传）
   - 只存 defaults 里声明过的键，避免把 UI 临时态写进存储
   - opts.drop 里的键永不落盘（例如预览角度）
   - opts.query 里的键会被 URL 参数覆盖（分享链接用） */
import { reactive, watch } from "vue";

export function persisted(key, defaults, opts = {}) {
  const drop = opts.drop || [];
  let saved = null;
  try {
    const raw = localStorage.getItem(key);
    saved = raw ? JSON.parse(raw) : null;
  } catch (e) { saved = null; }

  const state = reactive({ ...defaults });

  if (saved && typeof saved === "object") {
    Object.keys(defaults).forEach((k) => {
      if (drop.includes(k)) return;
      if (saved[k] === undefined || saved[k] === null) return;
      if (typeof defaults[k] === "number" && !isFinite(Number(saved[k]))) return;
      if (typeof defaults[k] === "boolean") state[k] = !!saved[k];
      else if (typeof defaults[k] === "number") state[k] = Number(saved[k]);
      else state[k] = String(saved[k]);
    });
  }

  if (opts.query) {
    Object.keys(opts.query).forEach((k) => {
      const v = opts.query[k];
      if (v === undefined || v === "") return;
      if (!(k in defaults)) return;
      if (typeof defaults[k] === "number") {
        const n = Number(v);
        if (isFinite(n)) state[k] = n;
      } else if (typeof defaults[k] === "boolean") {
        state[k] = v === "1" || v === "true";
      } else {
        state[k] = v;
      }
    });
  }

  let timer = 0;
  watch(
    state,
    () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const out = {};
        Object.keys(defaults).forEach((k) => {
          if (!drop.includes(k)) out[k] = state[k];
        });
        try { localStorage.setItem(key, JSON.stringify(out)); } catch (e) { /* 配额满了就算了 */ }
      }, 160);
    },
    { deep: true }
  );

  return state;
}