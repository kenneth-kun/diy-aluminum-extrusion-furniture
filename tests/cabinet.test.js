/*!
 * cabinet-test.js —— 铝型材抽屉柜核心逻辑的回归测试（Node，无依赖）
 * 用法：node cabinet-test.js
 */
"use strict";

import C from "../src/cores/cabinet.js";
var pass = 0, fail = 0;
var fails = [];

function ok(name, cond, extra) {
  if (cond) { pass++; console.log("  ✓ " + name); }
  else { fail++; fails.push(name + (extra ? " → " + extra : "")); console.log("  ✗ " + name + (extra ? " → " + extra : "")); }
}
function eq(name, got, want) { ok(name + " = " + want, got === want, "实得 " + got); }
function near(name, got, want, tol) { ok(name + " ≈ " + want, Math.abs(got - want) <= tol, "实得 " + got); }

/* ---------- 1. 默认方案 ---------- */
console.log("\n[1] 默认 45×40×76 / 4 抽 / 3030");
var p = C.computeCabinet({});
eq("抽屉数", p.dims.drawerN, 4);
eq("内空宽", p.dims.Wi, 390);
eq("内空深", p.dims.Di, 340);
eq("内空高", p.dims.Hi, 640);
eq("单抽净高", p.dims.Hd, 155);
eq("抽屉宽", p.dims.WD, 385);
eq("抽屉深", p.dims.DD, 310);
eq("导轨长度", p.dims.slide, 300);
ok("无警告", p.warnings.length === 0, p.warnings.join(" / "));
ok("总价在 1000–1500", p.total >= 1000 && p.total <= 1500, "实得 " + p.total);

/* ---------- 2. 切料表 ---------- */
console.log("\n[2] 切料表");
function cut(name, len) {
  return p.cut.filter(function (c) { return c.name.indexOf(name) >= 0 && c.len === len; })[0];
}
var c1 = cut("立柱", 700), c2 = cut("前后", 390), c3 = cut("左右", 340);
var c4 = cut("抽屉前横", 385), c5 = cut("抽屉前竖", 155), c6 = cut("抽屉侧上沿", 310);
ok("立柱 700×4", c1 && c1.qty === 4);
ok("顶/底框前后 390×4", c2 && c2.qty === 4);
ok("顶/底框左右 340×4", c3 && c3.qty === 4);
ok("抽屉前横 385×12", c4 && c4.qty === 12);
ok("抽屉前竖 155×8", c5 && c5.qty === 8);
ok("抽屉侧上沿 310×8", c6 && c6.qty === 8);
near("型材总长", p.cutTotalM, 14.06, 0.05);
ok("每段都是 5 的倍数", p.cut.every(function (c) { return c.len % 5 === 0; }));
ok("没有超长段（切料不得长于内空）",
  p.cut.filter(function (c) { return /抽屉前横/.test(c.name); })[0].len <= p.dims.Wi);

/* ---------- 3. 面板 ---------- */
console.log("\n[3] 面板尺寸");
var front = p.panels.filter(function (x) { return x.name === "抽屉前板"; })[0];
eq("前板宽", front.w, 357);
eq("前板高", front.h, 127);
eq("前板数量", front.qty, 4);
var base = p.panels.filter(function (x) { return x.name === "柜体底板"; })[0];
eq("底板宽", base.w, 402);
ok("有台面", p.panels.some(function (x) { return x.name === "台面"; }));
near("板材面积", p.panelArea, 1.91, 0.05);
ok("面板尺寸都是整数", p.panels.every(function (x) { return x.w % 1 === 0 && x.h % 1 === 0; }));

/* ---------- 4. 五金 ---------- */
console.log("\n[4] 五金件");
function part(k) { return p.parts.filter(function (x) { return x.name.indexOf(k) >= 0; })[0]; }
ok("角码 52 套", part("角码").qty === "52 套", "实得 " + part("角码").qty);
ok("端盖 56 个", part("端盖").qty === "56 个", "实得 " + part("端盖").qty);
ok("导轨 4 对", part("导轨").qty === "4 对");
ok("拉手 4 个", part("拉手").qty === "4 个");

/* ---------- 5. 尺寸取整（宁短不长） ---------- */
console.log("\n[5] 边界取整");
var q = C.computeCabinet({ W: 601, D: 401, H: 761, N: 4 });
eq("内空宽 601-60", q.dims.Wi, 541);
eq("抽屉宽 floor5", q.dims.WD, 470 + 65); // 541-2=539 → 535
eq("立柱长度 floor5", q.cut[0].len, 700);
ok("切料不超内空", q.dims.WD <= q.dims.Wi - 2);

/* ---------- 6. 规格切换 ---------- */
console.log("\n[6] 型材 / 台面 / 脚");
var p20 = C.computeCabinet({ prof: "2020" });
var p30 = C.computeCabinet({ prof: "3030" });
var p40 = C.computeCabinet({ prof: "4040" });
eq("2020 内空宽", p20.dims.Wi, 450 - 40);
eq("3030 内空宽", p30.dims.Wi, 450 - 60);
eq("4040 内空宽", p40.dims.Wi, 450 - 80);
ok("型材单价 2020<3030<4040", p20.lines[0].price < p30.lines[0].price && p30.lines[0].price < p40.lines[0].price,
  p20.lines[0].price + "/" + p30.lines[0].price + "/" + p40.lines[0].price);
ok("粗型材内空更小", p40.dims.Wi < p30.dims.Wi && p30.dims.Wi < p20.dims.Wi);
var noTop = C.computeCabinet({ top: "none" });
ok("不装台面更便宜", noTop.total < p.total);
ok("不装台面无台面板", !noTop.panels.some(function (x) { return x.name === "台面"; }));
var noFeet = C.computeCabinet({ feet: "none" });
eq("无脚高 0", noFeet.dims.legH, 0);
eq("无脚时柜体更高", noFeet.dims.frameH, 760 - 0);

/* ---------- 7. 警告 ---------- */
console.log("\n[7] 警告规则");
var bad = C.computeCabinet({ W: 300, D: 250, H: 450, N: 6, prof: "2020" });
ok("太矮有警告", bad.warnings.some(function (w) { return /偏矮/.test(w); }), bad.warnings.join(" / "));
ok("太浅有警告", bad.warnings.some(function (w) { return /太浅|装不下/.test(w); }));
ok("无导轨给出提示", bad.dims.slide === null || bad.warnings.some(function (w) { return /导轨/.test(w); }));
var tall = C.computeCabinet({ H: 1300 });
ok("过高有倾覆警告", tall.warnings.some(function (w) { return /倾覆|防倒/.test(w); }));
var wide = C.computeCabinet({ W: 1000, prof: "3030" });
ok("超宽建议 4040", wide.warnings.some(function (w) { return /4040/.test(w); }));

/* ---------- 8. 导轨取值 ---------- */
console.log("\n[8] 导轨标准档");
eq("pickSlide(240) 无", C.pickSlide(240), null);
eq("pickSlide(310)", C.pickSlide(310), 300);
eq("pickSlide(449)", C.pickSlide(449), 400);
eq("pickSlide(600)", C.pickSlide(600), 500);

/* ---------- 9. 导出 ---------- */
console.log("\n[9] 文本 / CSV / 步骤");
var txt = C.toText(p);
ok("文本含切料标题", txt.indexOf("型材切料") >= 0);
ok("文本含 700 mm × 4 根", /700 mm × 4 根/.test(txt));
var csv = C.toCSV(p);
var rows = csv.split("\r\n");
ok("CSV 有表头", rows[0].indexOf("类别,名称") === 0);
ok("CSV 行数 > 20", rows.length > 20, "实得 " + rows.length);
var s = C.buildSteps(p);
eq("步骤数", s.steps.length, 13);
ok("每步都有验收", s.steps.every(function (x) { return x.k && x.k.length > 2; }));
ok("坑 ≥ 5", s.pitfalls.length >= 5);
ok("工具 ≥ 6", s.tools.length >= 6);
eq("keyNumbers 六格", s.keyNumbers.length, 6);

/* ---------- 10. 极端输入不崩 ---------- */
console.log("\n[10] 极端输入");
var weird = C.computeCabinet({ W: -100, D: 0, H: NaN, N: 99 });
ok("负数被夹住", weird.ok && weird.dims.W >= 250 && weird.dims.drawerN <= 8);
var one = C.computeCabinet({ N: 1, H: 400 });
ok("单抽可用", one.dims.drawerN === 1 && one.dims.Hd > 0);


/* ---------- 11. 端盖固定方式（攻丝） ---------- */
console.log("\n[11] 端盖固定方式");
var cp2 = C.computeCabinet({ capFix: "press" });
var ct2 = C.computeCabinet({ capFix: "tap" });
var cs2 = C.computeCabinet({ capFix: "selftap" });
eq("卡扣：无攻丝孔", cp2.capHoles, 0);
ok("卡扣：BOM 无攻丝行", !cp2.lines.some(function (l) { return l.name.indexOf("攻丝") >= 0; }));
eq("攻丝：孔数 = 端盖数", ct2.capHoles, ct2.capCount);
ok("攻丝：BOM 有攻丝行", ct2.lines.some(function (l) { return l.name.indexOf("攻丝") >= 0; }));
ok("攻丝比卡扣贵", ct2.total > cp2.total);
ok("自攻：不攻丝但更贵", cs2.capHoles === cs2.capCount && cs2.total > cp2.total && !cs2.lines.some(function (l) { return l.name.indexOf("攻丝") >= 0; }));
ok("攻丝：装配有「装端盖」步", C.buildSteps(ct2).steps.some(function (x) { return x.t === "装端盖"; }));
ok("攻丝：工具加丝锥", C.buildSteps(ct2).tools.some(function (x) { return x.indexOf("丝锥") >= 0; }));
ok("攻丝：文本带端面段", C.toText(ct2).indexOf("— 端面 —") >= 0);
ok("攻丝：文本写明孔数", C.toText(ct2).indexOf("需攻丝 " + ct2.capHoles + " 孔") >= 0);
ok("攻丝：CSV 含攻丝行", C.toCSV(ct2).indexOf("端面攻丝") >= 0);
ok("非法值回落卡扣", C.computeCabinet({ capFix: "zzz" }).capFix === "press");

console.log("\n" + (fail ? "❌ " : "✅ ") + pass + " 通过 / " + fail + " 失败");
if (fail) { console.log(fails.map(function (f) { return "   - " + f; }).join("\n")); process.exit(1); }
