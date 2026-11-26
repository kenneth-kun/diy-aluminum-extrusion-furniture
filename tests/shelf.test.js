/*!
 * shelf.test.js —— 光轴展示架（层数规划器）核心逻辑回归测试（Node，无依赖）
 * 用法：node tests/shelf.test.js
 */
"use strict";

import P from "../src/cores/planner.js";

var pass = 0, fail = 0, fails = [];

function ok(name, cond, extra) {
  if (cond) { pass++; console.log("  ✓ " + name); }
  else { fail++; fails.push(name + (extra ? " → " + extra : "")); console.log("  ✗ " + name + (extra ? " → " + extra : "")); }
}
function eq(name, got, want) { ok(name + " = " + want, got === want, "实得 " + got); }
function near(name, got, want, tol) { ok(name + " ≈ " + want, Math.abs(got - want) <= tol, "实得 " + got); }

/* ---------- 1. 默认场景：60×30×55 cm 空间 · 1:64 · 按空间排 ---------- */
console.log("\n[1] 默认空间 60×30×55 · 1:64");
var p = P.computePlan({ withLight: true, withDoor: true });
ok("方案可用", p.ok === true);
eq("外宽", p.frame.W, 580);
eq("外深", p.frame.D, 280);
ok("层数 ≥ 6", p.layers >= 6, "实得 " + p.layers);
ok("每层台数 > 0", p.perLayer > 0, "实得 " + p.perLayer);
ok("总高不超过空间", p.frame.H <= 550, "实得 " + p.frame.H);
ok("总价在区间内", p.total >= p.totalMin && p.total <= p.totalMax);
ok("解释文案讲清层数来历", /层距|内空/.test(p.explain));
ok("有切料行", p.lines.length > 5, "实得 " + p.lines.length);
ok("每行都有搜索词", p.lines.every((l) => l.kw && l.kw.length > 2));
ok("有装配步骤", P.buildSteps(p).steps.length >= 6);

/* ---------- 2. 空间太小 → 明确拒绝 ---------- */
console.log("\n[2] 放不下的空间");
var bad = P.computePlan({ spaceH: 20, pitch: 160 });
ok("层距太大时明确拒绝", bad.ok === false);
ok("返回 ok=false", bad.ok === false);
ok("给出原因文案", !!bad.error, bad.error);

/* ---------- 3. 手动层数 + 车数模式 ---------- */
console.log("\n[3] 手动层数 / 按车数");
var man = P.computePlan({ mode: "manual", layers: 5 });
eq("手动层数生效", man.layers, 5);
var byCars = P.computePlan({ mode: "cars", cars: 120 });
ok("按车数能给层数", byCars.layers > 0);
ok("按车数能给出容量", byCars.capacity > 0, "实得 " + byCars.capacity);

/* ---------- 4. 层距 ---------- */
console.log("\n[4] 层距");
var auto = P.computePlan({ pitch: "auto" });
ok("自动层距 > 0", auto.pitch > 0);
var fixed = P.computePlan({ pitch: 70 });
eq("固定层距生效", fixed.pitch, 70);
ok("固定层距影响总高", fixed.frame.H !== auto.frame.H || fixed.layers !== auto.layers);

/* ---------- 5. φ8 光轴 + 预算 ---------- */
console.log("\n[5] φ8 光轴 / 预算");
var rod8 = P.computePlan({ rod: "8" });
ok("φ8 总价更低", rod8.total <= p.total, rod8.total + " vs " + p.total);
var bud = P.computePlan({ budget: 600 });
ok("预算内给出层数建议", bud.layers > 0);

/* ---------- 6. PETG 打印（层板材料改打印件） ---------- */
console.log("\n[6] PETG 打印方案");
var pr = P.computePlan({ shelfMaterial: "petg" });
if (pr.printPlan) {
  ok("有打印计划", !!pr.printPlan);
  ok("盘子数 ≥ 1", pr.printPlan.plates >= 1, "实得 " + pr.printPlan.plates);
  ok("耗材克数 > 0", pr.printPlan.grams > 0, "实得 " + pr.printPlan.grams);
  ok("打印时长 > 0", pr.printPlan.hours > 0, "实得 " + pr.printPlan.hours);
} else {
  ok("未选打印材料时没有打印计划", pr.shelfMaterial !== "petg");
}

/* ---------- 7. 导出文本 ---------- */
console.log("\n[7] 导出");
var txt = P.toText(p);
ok("文本含采购清单", /采购清单/.test(txt));
ok("文本含总价", txt.indexOf(String(Math.round(p.total))) >= 0);

console.log("\n" + (fail ? "✗ " + fail + " 项失败" : "✓ 全部通过") + "（" + pass + "/" + (pass + fail) + "）");
if (fail) { fails.forEach((f) => console.log("  - " + f)); process.exit(1); }