import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { existsSync, statSync, mkdirSync, copyFileSync, createReadStream, readdirSync, cpSync } from "node:fs";
import { resolve, extname } from "node:path";

/* 会被复制进 dist/docs/ 的静态资料（仓库根目录继续保留一份，方便在 GitHub 上直接读） */
const DOC_FILES = [
  "README.md", "材料清单.md", "铝型材柜.md", "铝型材桌面柜.md", "亚克力展示盒.md",
  "打包与发布.md", "采购清单.csv", "尺寸图.png", "LICENSE"
];

const MIME = {
  ".md": "text/markdown; charset=utf-8",
  ".csv": "text/csv; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".stl": "model/stl",
  ".txt": "text/plain; charset=utf-8"
};

/* dev：/docs/xxx 直接从仓库根目录读文件；build：拷进 dist/docs/ */
function docsPlugin() {
  return {
    name: "diy-docs",
    configureServer(server) {
      server.middlewares.use("/docs", (req, res, next) => {
        const rel = decodeURIComponent((req.url || "/").split("?")[0]).replace(/^\/+/, "");
        const file = resolve(process.cwd(), rel);
        if (!file.startsWith(process.cwd()) || !existsSync(file) || !statSync(file).isFile()) return next();
        res.setHeader("Content-Type", MIME[extname(file)] || "application/octet-stream");
        createReadStream(file).pipe(res);
      });
    },
    closeBundle() {
      const out = resolve(process.cwd(), "dist/docs");
      mkdirSync(out, { recursive: true });
      DOC_FILES.forEach((f) => {
        if (existsSync(f)) copyFileSync(f, resolve(out, f));
      });
      if (existsSync("petg")) cpSync("petg", resolve(out, "petg"), { recursive: true });
      const media = resolve(process.cwd(), "public/media");
      if (existsSync(media)) cpSync(media, resolve(out, "media"), { recursive: true });
    }
  };
}

/* IIFE 产物不需要 module 语义，但 Vite 会给入口打上 type="module" —— file:// 下 module 会被
   CORS 拦掉导致白屏，这里改回普通 script（defer 保证 DOM 就绪后执行）。 */
function classicScriptPlugin() {
  return {
    name: "diy-classic-script",
    apply: "build",
    transformIndexHtml(html) {
      return html
        .replace(/<script type="module" crossorigin src="([^"]+)"><\/script>/, '<script defer src="$1"></script>')
        /* file:// 下 origin 是 null，带 crossorigin 的 <link> 会被当成跨域请求而丢掉样式 */
        .replace(/<link rel="stylesheet" crossorigin href="([^"]+)">/, '<link rel="stylesheet" href="$1">');
    }
  };
}

export default defineConfig({
  base: "./",
  plugins: [vue(), docsPlugin(), classicScriptPlugin()],
  server: { host: "127.0.0.1", port: 5177 },
  build: {
    outDir: "dist",
    target: "es2019",
    assetsInlineLimit: 4096,
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        /* 打成单文件 IIFE：file:// 双击也能跑（ES module 在 file:// 下会被 CORS 拦掉） */
        format: "iife",
        inlineDynamicImports: true,
        entryFileNames: "assets/app.js",
        assetFileNames: "assets/[name][extname]"
      }
    }
  }
});