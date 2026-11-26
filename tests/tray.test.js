/*!
 * tray-test.js —— 桌面收纳柜（盆位）核心逻辑的回归测试（Node，无依赖）
 * 用法：node tray-test.js
 */
"use strict";

import T from "../src/cores/tray.js";
var pass = 0, fail = 0;
var fails = [];

function ok(name, cond, extra) {
  if (cond) { pass++; console.log("  ✓ " + name); }
  else { fail++; fails.push(name + (extra ? " → " + extra : "")); console.log("  ✗ " + name + (extra ? " → " + extra : "")); }
}
function eq(name, got, want) { ok(name + " = " + want, got === want, "实得 " + got); }
function near(name, got, want, tol) { ok(name + " ≈ " + want, Math.abs(got - want) <= tol, "实得 " + got); }

/* ---------- 1. 默认方案（3 层 · 中盆） ---------- */
console.log("\n[1] 默认 3 层 × 400×300×120");
var p = T.computeTray({});
eq("层数", p.dims.N, 3);
eq("盆宽", p.dims.binW, 400);
eq("内空宽", p.dims.Wi, 415);
eq("内空深", p.dims.Di, 315);
eq("外廓宽", p.dims.W, 455);
eq("外廓深", p.dims.D, 355);
eq("层距", p.dims.Hd, 150);
eq("立柱长", p.dims.Lv, 470);
eq("总高", p.dims.H, 475);
near("每侧余量", (p.dims.Wi - p.dims.binW) / 2, 7.5, 0.01);
ok("无警告", p.warnings.length === 0, p.warnings.join(" / "));

/* ---------- 2. 公式自洽 ---------- */
console.log("\n[2] 公式自洽");
ok("层距 = 盆高 + 型材 + 余量（取整 5）", p.dims.Hd === Math.floor((p.dims.binH + p.dims.profSize + T.CLEAR) / 5) * 5, "实得 " + p.dims.Hd);
ok("立柱长 = N×层距 + 顶框（取整 5）", p.dims.Lv === Math.floor((p.dims.N * p.dims.Hd + p.dims.profSize) / 5) * 5, "实得 " + p.dims.Lv);
ok("总高 = 立柱 + 脚", p.dims.H === p.dims.Lv + p.dims.feetH, "实得 " + p.dims.H);
ok("外廓 = 内空 + 2×型材", p.dims.W === p.dims.Wi + 2 * p.dims.profSize);

/* ---------- 3. 切料表 ---------- */
console.log("\n[3] 切料表");
function cutRow(sub) { return p.cut.filter(function (c) { return c.name.indexOf(sub) >= 0; })[0]; }
var r1 = cutRow("立柱"), r2 = cutRow("横向梁"), r3 = cutRow("纵向梁");
eq("立柱长", r1.len, 470);
eq("立柱数量", r1.qty, 4);
eq("横向梁长", r2.len, 415);
eq("横向梁数量 = 2(N+1)", r2.qty, 2 * (p.dims.N + 1));
eq("纵向梁长", r3.len, 315);
eq("纵向梁数量（含底框左右）", r3.qty, 4);
near("型材总长", p.cutTotalM, (470 * 4 + 415 * 8 + 315 * 4) / 1000, 0.001);
eq("型材总长显示", p.cutTotalM.toFixed(2), "6.46");

/* ---------- 4. 顶板 ---------- */
console.log("\n[4] 顶板");
eq("顶板块数", p.panels.length, 1);
eq("顶板宽 = 内空 + 12", p.panels[0].w, 427);
eq("顶板深 = 内空 + 12", p.panels[0].h, 327);
eq("顶板厚", p.panels[0].th, 3);
near("顶板面积", p.panelArea, 427 * 327 / 1e6, 1e-6);
eq("不装顶板 → 无板", T.computeTray({ top: "none" }).panels.length, 0);

/* ---------- 5. 五金与报价 ---------- */
console.log("\n[5] 五金与报价");
function part(sub) { return p.parts.filter(function (x) { return x.name.indexOf(sub) >= 0; })[0]; }
eq("盆数量", part("抽屉盆").qty, "3 个");
eq("角码 = 梁数×2", part("角码").qty, ((2 * (p.dims.N + 1) + 4) * 2) + " 套");
eq("端盖 = 梁数×2 + 4", part("端盖").qty, ((2 * (p.dims.N + 1) + 4) * 2 + 4) + " 个");
ok("总价 250–360", p.total >= 250 && p.total <= 360, "实得 " + p.total);
ok("区间包住总价", p.lo <= p.total && p.total <= p.hi, p.lo + "–" + p.hi);
ok("每行都有价格", p.lines.every(function (l) { return l.price >= 0 && l.lo <= l.price && l.price <= l.hi; }));
ok("BOM 行都有搜索关键词", p.lines.every(function (l) { return typeof l.kw === "string" && l.kw.length > 0; }));

/* ---------- 6. 层数 / 盆型变化 ---------- */
console.log("\n[6] 参数变化");
var p1 = T.computeTray({ N: 1 });
var p5 = T.computeTray({ N: 5 });
eq("1 层总高 = 1×150+20+5", p1.dims.H, 175);
eq("5 层总高 = 5×150+20+5", p5.dims.H, 775);
ok("层数越多价越高", p5.total > p.total && p.total > p1.total);
eq("层数越界 → 6", T.computeTray({ N: 99 }).dims.N, 6);
eq("层数越界 → 1", T.computeTray({ N: -3 }).dims.N, 1);

var sm = T.computeTray({ bin: "small", N: 3 });
var lg = T.computeTray({ bin: "large", N: 3 });
eq("小盆外宽", sm.dims.W, 355);
eq("大盆外宽", lg.dims.W, 555);
ok("盆越大越贵", lg.total > p.total && p.total > sm.total);

var cu = T.computeTray({ bin: "custom", binW: 450, binD: 320, binH: 130 });
eq("自定义盆宽生效", cu.dims.binW, 450);
eq("自定义外宽 = 450+16+40", cu.dims.W, 505);
eq("自定义层距 = 130+20+14 → 取整 160", cu.dims.Hd, 160);
eq("预设尺寸不被自定义覆盖", T.computeTray({ bin: "mid", binW: 999 }).dims.binW, 400);

/* ---------- 7. 型材 / 配件开关 ---------- */
console.log("\n[7] 型材与配件");
var p30 = T.computeTray({ prof: "3030" });
eq("3030 外宽 = 400+16+60", p30.dims.W, 475);
eq("3030 立柱长 = 3×160+30", p30.dims.Lv, 510);
ok("3030 比 2020 贵", p30.total > p.total);
var noRigid = T.computeTray({ baseRigid: false });
eq("不加底框左右 → 纵向梁 2 根", noRigid.cut.filter(function (c) { return c.name.indexOf("纵向") >= 0; })[0].qty, 2);
ok("少两根 → 型材更短", noRigid.cutTotalM < p.cutTotalM);
ok("少两根 → 更便宜", noRigid.total < p.total);
var noTop = T.computeTray({ top: "none" });
ok("不装顶板更便宜", noTop.total < p.total);
ok("不装顶板 → 立柱短 3mm 以内", p.dims.Lv - noTop.dims.Lv <= 5, (p.dims.Lv - noTop.dims.Lv) + " mm");

/* ---------- 8. 警告 ---------- */
console.log("\n[8] 警告");
ok("5 层有提醒", T.computeTray({ N: 5 }).warnings.length > 0);
ok("超宽 → 塌腰提醒", T.computeTray({ bin: "custom", binW: 900 }).warnings.some(function (w) { return w.indexOf("塌腰") >= 0; }));
ok("高盆提醒", T.computeTray({ bin: "custom", binH: 250 }).warnings.some(function (w) { return w.indexOf("盆高") >= 0; }));
ok("正常方案无警告", p.warnings.length === 0);

/* ---------- 9. 配色 ---------- */
console.log("\n[9] 配色");
eq("配色条数 = 层数", p.colors.length, 3);
eq("第 1 层砖红", p.colors[0].name, "砖红");
eq("第 2 层墨绿", p.colors[1].name, "墨绿");
eq("第 3 层藏蓝", p.colors[2].name, "藏蓝");
eq("5 层循环取色", T.computeTray({ N: 5 }).colors[4].name, "中灰");
eq("端盖色可换", T.computeTray({ color: "black" }).capColor, "#2b2f33");

/* ---------- 10. 导出 ---------- */
console.log("\n[10] 导出");
var txt = T.toText(p);
ok("文本含标题", txt.indexOf("铝型材桌面收纳柜") >= 0);
ok("文本含切料", txt.indexOf("415 mm × 8 根") >= 0);
ok("文本含合计", txt.indexOf("合计 ≈ " + p.total) >= 0);
var csv = T.toCSV(p);
ok("CSV 有表头", csv.split("\r\n")[0].indexOf("类别,名称") === 0);
ok("CSV 含盆", csv.indexOf("抽屉盆") >= 0);
ok("CSV 行数 > 12", csv.split("\r\n").length > 12);
var s = T.buildSteps(p);
eq("装配步骤数（含装端盖）", s.steps.length, 10);
eq("关键数字 6 项", s.keyNumbers.length, 6);
ok("每步都有验收标准", s.steps.every(function (x) { return x.k && x.k.length > 0; }));
ok("有工具清单", s.tools.length >= 5);
ok("有坑清单", s.pitfalls.length >= 5);
ok("intro 带尺寸", s.intro.indexOf("455") >= 0);


/* ---------- 11. 端盖固定方式（攻丝） ---------- */
console.log("\n[11] 端盖固定方式");
var cp = T.computeTray({ capFix: "press" });
var ct = T.computeTray({ capFix: "tap" });
var cs = T.computeTray({ capFix: "selftap" });
eq("卡扣：无攻丝孔", cp.capHoles, 0);
ok("卡扣：BOM 无攻丝行", !cp.lines.some(function (l) { return l.name.indexOf("攻丝") >= 0; }));
eq("攻丝：孔数 = 端盖数", ct.capHoles, ct.capCount);
ok("攻丝：BOM 有攻丝行", ct.lines.some(function (l) { return l.name.indexOf("攻丝") >= 0; }));
eq("攻丝：五金件数量文本", ct.parts.filter(function (l) { return l.name.indexOf("攻丝") >= 0; })[0].qty, ct.capCount + " 孔");
ok("攻丝比卡扣贵", ct.total > cp.total);
ok("攻丝加价 = 端盖差价 + 攻丝费（容差 3）",
  Math.abs((ct.total - cp.total) - (Math.round(ct.capCount * 0.5) + Math.round(ct.capCount * 1.2))) <= 3);
ok("自攻：不攻丝但单价更高", cs.capHoles === cs.capCount && cs.total > cp.total && !cs.lines.some(function (l) { return l.name.indexOf("攻丝") >= 0; }));
ok("攻丝：端盖关键词带「带螺丝」", ct.lines.filter(function (l) { return l.name === "型材端盖"; })[0].kw.indexOf("螺丝") >= 0);
var cst = T.buildSteps(ct), pst = T.buildSteps(cp);
ok("攻丝：装配有「装端盖」步", cst.steps.some(function (x) { return x.t === "装端盖"; }));
ok("攻丝：端盖步提到攻丝", cst.steps.filter(function (x) { return x.t === "装端盖"; })[0].d.indexOf("攻") >= 0);
ok("卡扣：端盖步说压入", pst.steps.filter(function (x) { return x.t === "装端盖"; })[0].d.indexOf("压") >= 0);
ok("攻丝：工具加丝锥", cst.tools.some(function (x) { return x.indexOf("丝锥") >= 0; }));
ok("卡扣：工具无丝锥", !pst.tools.some(function (x) { return x.indexOf("丝锥") >= 0; }));
ok("攻丝：文本导出带端面段", T.toText(ct).indexOf("— 端面 —") >= 0);
ok("攻丝：文本写明攻丝孔", T.toText(ct).indexOf("需攻丝 " + ct.capHoles + " 孔") >= 0);
ok("卡扣：文本写免攻丝", T.toText(cp).indexOf("免攻丝") >= 0);
ok("非法值回落到卡扣", T.computeTray({ capFix: "xxx" }).capFix === "press");

/* ---------- 汇总 ---------- */
console.log("\n" + (fail ? "✗" : "✓") + " 通过 " + pass + " / " + (pass + fail));
if (fail) { console.log("失败项：\n  - " + fails.join("\n  - ")); process.exit(1); }