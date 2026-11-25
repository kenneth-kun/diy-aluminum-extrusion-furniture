/*!
 * display-core.js —— 「亚克力展示盒 · 悬停面板」切料 + 预算纯逻辑层
 * 不依赖 DOM，可被浏览器 <script> 引入（window.DisplayCore），也可被 Node require。
 * 参考对象：小红书「香！层数无限扩展 and 面板任意悬停」（铝型材展示盒）。
 * 结构：每层 = 一个粘好的亚克力盒（左右侧板 + 后板 + 底板）+ 前沿一根铝梁 + 两片任意停合页 + 一扇亚克力门；
 *       层与层之间直接叠放，靠 4 个亚克力定位销对位，无需螺丝连接（加层 = 再放一个盒子上去）。
 * 所有内部长度单位为 mm，界面输入用 cm。
 */
(function (global) {
  "use strict";

  /* ---------------- 亚克力板 ---------------- */
  var SHEETS = {
    "5":  { label: "5 mm 浇铸透明", th: 5, price: 280, note: "最常用：透、够硬、合页能咬住" },
    "3":  { label: "3 mm 浇铸透明", th: 3, price: 190, note: "轻、便宜，但门会发飘，大于 400 宽别用" },
    "8":  { label: "8 mm 浇铸透明", th: 8, price: 420, note: "门重手稳，合页要选大号，价格也上去了" }
  };

  /* ---------------- 前沿铝梁 ---------------- */
  var RAILS = {
    "2020": { label: "2020 型材（20×20）", h: 20, d: 20, price: 10,
              note: "最好买、有槽可藏线；截面方，侧面看略厚" },
    "flat": { label: "10×20 扁铝（拉丝）", h: 20, d: 10, price: 7,
              note: "原帖观感：薄、贴脸、不抢戏；需要卖家切 + 攻 M4" }
  };

  /* ---------------- 合页 ---------------- */
  var HINGES = {
    friction: { label: "任意停合页（铜色）", price: 15, hold: 4.0,
                note: "靠轴内摩擦片顶住，任意角度停；别上油，一上有油就滑" },
    damped:   { label: "阻尼上翻合页",       price: 24, hold: 5.0,
                note: "关到最后一段会自己缓落，手感最好，贵 9 元/个" },
    none:     { label: "不装门（敞口）",      price: 0,  hold: 0,
                note: "最便宜也最方便，但灰尘和猫都挡不住" }
  };

  /* ---------------- 顶盖 ---------------- */
  var LIDS = {
    full:  { label: "整片亚克力顶盖", th: 1, price: 1, note: "最干净，能放东西" },
    none:  { label: "不加顶盖",       th: 0, price: 0, note: "敞口展示，取放最快" }
  };

  /* ---------------- 脚 ---------------- */
  var FEETS = {
    pad:   { label: "透明硅胶脚垫（8 个）", h: 3, price: 1.5 },
    metal: { label: "铝圆脚 M6",           h: 12, price: 3.5 },
    none:  { label: "直接放在桌面",         h: 0, price: 0 }
  };

  /* ---------------- 价格（元，2025 年散买中值） ---------------- */
  var PRICE = {
    cutPerM: 1.2,       // 亚克力激光切割，按延米
    gluePerBox: 40,     // 亚克力厂粘盒体手工费（每层）
    craftPerPiece: 12,  // 门/顶板的倒角、圆边、手指槽
    endcap: 0.8,        // 铝梁端盖
    pin: 0.3,           // 亚克力定位销 φ6×10
    screwPack: 20,      // M4 沉头 + 尼龙螺母 + 内六角
    glueTube: 25,       // 亚克力专用胶（二氯甲烷类）
    railCut: 1.0        // 铝梁切料费
  };

  var KW = {
    "亚克力板（含切割）": "亚克力板 透明 5mm 定制切割 激光",
    "盒体粘接（厂里做）": "亚克力 粘接 加工 定制 盒子",
    "铝梁": "铝型材 2020 银色 切割 定制",
    "扁铝": "扁铝 10x20 拉丝 切割 定制",
    "任意停合页": "任意停合页 玻璃柜门 阻尼 铜色",
    "合页螺丝": "M4 沉头螺丝 尼龙螺母 亚克力",
    "铝梁端盖": "铝型材端盖 2020 塑料 黑色",
    "定位销": "亚克力定位销 6mm 透明",
    "亚克力胶": "亚克力专用胶水 二氯甲烷 针筒",
    "脚": "硅胶透明脚垫 自粘 家具",
    "M4 攻丝": "铝型材 端面攻丝 M4 加工 定制"
  };

  function floor5(v) { return Math.floor(v / 5) * 5; }
  function round5(v) { return Math.round(v / 5) * 5; }
  function clamp(v, a, b) { return Math.min(b, Math.max(a, Number(v) || a)); }

  function addCut(list, name, len, qty, group) {
    if (!len || !qty) return;
    list.push({ name: name, len: Math.round(len), qty: qty, group: group || "" });
  }

  var DENSITY = 1.19;   // g/cm³（亚克力）
  function sheetKg(w, h, th) { return w * h * th / 1e9 * DENSITY * 1000; } // kg

  /* ---------------- 主计算 ---------------- */
  function computeDisplay(input) {
    var o = Object.assign({
      W: 300, D: 250, H: 250, N: 3, sheet: "5", rail: "2020",
      hinge: "friction", lid: "full", feet: "pad"
    }, input || {});

    var sheet = SHEETS[o.sheet] || SHEETS["5"];
    var rail = RAILS[o.rail] || RAILS["2020"];
    var hinge = HINGES[o.hinge] || HINGES.friction;
    var lid = LIDS[o.lid] || LIDS.full;
    var feet = FEETS[o.feet] || FEETS.pad;

    var t = sheet.th;
    var N = clamp(Math.round(o.N), 1, 6);
    var Wi = floor5(clamp(o.W, 150, 800));
    var Di = floor5(clamp(o.D, 120, 500));
    var Hi = floor5(clamp(o.H, 120, 600));

    /* ---- 外廓 ---- */
    var Wo = Wi + 2 * t;                 // 外宽 = 内宽 + 两侧板
    var Do = Di + 2 * t;                 // 外深
    var Hl = Hi + rail.h;                // 单层高 = 净高 + 前沿铝梁
    var H = N * Hl + lid.th + feet.h;    // 总高

    /* ---- 门 ---- */
    var doorW, doorH, doors, hingesPerDoor, doorKg;
    if (hinge.price > 0) {
      doors = Wo > 640 ? 2 : 1;                       // 宽箱体做双开门
      doorW = doors === 1 ? Wi - 2 : floor5((Wi - 6) / 2);
      doorH = Hi - 4;
      hingesPerDoor = doorW > 420 ? 3 : 2;
      doorKg = sheetKg(doorW, doorH, t);
    } else {
      doors = 0; doorW = 0; doorH = 0; hingesPerDoor = 0; doorKg = 0;
    }
    var hingeCount = doors * hingesPerDoor * N;
    var holdNeed = doorKg;
    var holdCap = hinge.hold * Math.max(hingesPerDoor, 1);

    /* ---- 检查 ---- */
    var warnings = [], notes = [];
    if (doors > 0 && holdNeed > holdCap * 0.8) {
      warnings.push("单扇门约 " + doorKg.toFixed(2) + " kg，" + hingesPerDoor + " 个合页额定 " +
        holdCap.toFixed(1) + " kg 已经贴近上限：换成「" + HINGES.damped.label + "」或把门减窄/减薄。");
    }
    // 任意停合页真正先失效的是"能不能停住"——门超过 1.5 kg 就开始自己往下溜
    if (doors > 0 && doorKg > 1.5) {
      warnings.push("单扇门 " + doorKg.toFixed(2) + " kg 偏重，普通任意停合页会自己往下溜：" +
        "改用「" + HINGES.damped.label + "」、减薄门板，或中间加一片合页。");
    }
    if (sheet.th === 3 && doorW > 400) warnings.push("3 mm 门宽 " + doorW + " mm 会发飘、悬停角度不稳，建议 5 mm。");
    if (Wo > 700) warnings.push("外宽 " + Wo + " mm，单扇门太宽会扭：已经自动改成双开门；再宽建议中间加一根立柱。");
    if (H > 900) warnings.push("总高 " + H + " mm 叠这么高，最下层取放要弯腰、整体也容易被碰倒，靠墙放。");
    if (N > 4) warnings.push(N + " 层 × 单层 " + Hl + " mm，整体重心高：每层之间除了定位销，再贴 4 段 VHB 双面胶。");
    if (Di < 160) warnings.push("内深 " + Di + " mm 放不下大多数手办底座（常见 120–180），确认一下藏品。");
    if (Hi - 4 < 140) warnings.push("净高 " + Hi + " mm 里，铝梁占 " + rail.h + " mm，实际开口只剩 " + (Hi - 4) +
      " mm，手和藏品都不好进：净高建议 ≥ 160。");

    if (o.rail === "flat") notes.push("扁铝要卖家切好并两端攻 M4（1.2 元/孔），自己手锯会歪。");
    if (sheet.th >= 5) notes.push("5 mm 门可以在顶部开一个 R25 半圆手指槽，掀门更顺手（厂里激光一次成型）。");
    notes.push("每层盒体让亚克力厂粘好再发货：自己粘容易花、容易歪，手工费 40 元/层很值。");
    if (feet.h === 0) notes.push("不加脚的话底面要垫一层 1 mm EVA，避免亚克力直接磨桌面。");

    /* ---- 切料：亚克力 ---- */
    var cutAc = [];
    addCut(cutAc, "侧板（左右）", Do, 2 * N, "盒体");
    addCut(cutAc, "后板", Wi, 1 * N, "盒体");
    addCut(cutAc, "底板", Wo, 1 * N, "盒体");
    if (doors === 1) addCut(cutAc, "门板", doorH, 1 * N, "门");
    if (doors === 2) addCut(cutAc, "门板（对开）", doorH, 2 * N, "门");
    if (lid.th > 0) addCut(cutAc, "顶盖", Do, 1, "顶盖");

    var cutAcTotalM = 0;
    cutAc.forEach(function (c) { cutAcTotalM += c.len * c.qty / 1000; });

    /* ---- 面积 ---- */
    var areaSide = 2 * N * Do * Hl / 1e6;
    var areaBack = N * Wi * Hl / 1e6;
    var areaBase = N * Wo * Do / 1e6;
    var areaDoor = doors * N * doorW * doorH / 1e6;
    var areaLid = lid.th > 0 ? Wo * Do / 1e6 : 0;
    var area = areaSide + areaBack + areaBase + areaDoor + areaLid;

    /* ---- 切料：铝梁 ---- */
    var cutAl = [];
    addCut(cutAl, rail.label + " 前沿梁", Wi, N, "每层");
    if (lid.th > 0) addCut(cutAl, rail.label + " 顶盖压条（可选）", Wi, 1, "顶盖");
    var cutAlTotalM = 0;
    cutAl.forEach(function (c) { cutAlTotalM += c.len * c.qty / 1000; });

    /* ---- 五金 ---- */
    var endcaps = N * 2;
    var pins = (N - 1) * 4;
    var parts = [];
    if (doors > 0) {
      parts.push({ name: "任意停合页", spec: hinge.label + " · M4", qty: hingeCount + " 个",
                   price: Math.round(hingeCount * hinge.price), kw: KW["任意停合页"] });
      parts.push({ name: "合页螺丝", spec: "M4×8 沉头 + M4 尼龙螺母 + 垫片", qty: hingeCount * 2 + " 套",
                   price: Math.round(hingeCount * 0.6) + 10, kw: KW["合页螺丝"] });
    }
    parts.push({ name: "铝梁端盖", spec: "20×20 方头 / 10×20 扁头 · 黑色", qty: endcaps + " 个",
                 price: Math.round(endcaps * PRICE.endcap), kw: KW["铝梁端盖"] });
    if (pins > 0) parts.push({ name: "定位销", spec: "φ6×10 透明亚克力", qty: pins + " 个", price: Math.round(pins * PRICE.pin), kw: KW["定位销"] });
    parts.push({ name: "脚", spec: feet.label, qty: (feet.h ? 4 : 0) + " 个", price: Math.round(feet.h ? 4 * feet.price : 0), kw: KW["脚"] });
    parts.push({ name: "亚克力胶", spec: "二氯甲烷针筒 50 ml", qty: "2 支", price: PRICE.glueTube * 2, kw: KW["亚克力胶"] });
    parts.push({ name: "螺丝 / 工具", spec: "内六角 + 钻头 φ4.2 / φ3", qty: "1 包", price: PRICE.screwPack, kw: "手电钻 亚克力 钻头 4.2 套装" });

    /* ---- 主料 ---- */
    var lines = [];
    lines.push({ name: "亚克力板（含切割）", spec: sheet.label + " · 合计 " + area.toFixed(2) + " ㎡",
                 qty: "1 批", price: Math.round(area * sheet.price + cutAcTotalM * PRICE.cutPerM), kw: KW["亚克力板（含切割）"] });
    lines.push({ name: "盒体粘接（厂里做）", spec: "侧板 + 后板 + 底板粘成盒", qty: N + " 层",
                 price: Math.round(N * PRICE.gluePerBox), kw: KW["盒体粘接（厂里做）"] });
    var craft = (doors > 0 ? N * doors : 0) + (lid.th > 0 ? 1 : 0);
    if (craft) lines.push({ name: "倒角 / 圆边 / 手指槽", spec: "门板与顶盖边缘处理", qty: craft + " 片",
                            price: Math.round(craft * PRICE.craftPerPiece), kw: KW["亚克力板（含切割）"] });
    lines.push({ name: o.rail === "flat" ? "扁铝" : "铝梁", spec: rail.label + " · 合计 " + cutAlTotalM.toFixed(2) + " m",
                 qty: (N + (lid.th > 0 ? 1 : 0)) + " 根",
                 price: Math.round(cutAlTotalM * rail.price + cutAlTotalM * PRICE.railCut),
                 kw: o.rail === "flat" ? KW["扁铝"] : KW["铝梁"] });
    if (o.rail === "flat") {
      lines.push({ name: "铝梁端面攻丝（M4）", spec: "每根两端，装端盖 + 合页底座", qty: (N * 2) + " 孔",
                   price: Math.max(10, Math.round(N * 2 * 1.2)), kw: KW["M4 攻丝"] });
    }
    lines = lines.concat(parts);

    lines.forEach(function (l) {
      l.lo = Math.round((l.price || 0) * 0.82);
      l.hi = Math.round((l.price || 0) * 1.22);
    });
    var total = lines.reduce(function (s, l) { return s + (l.price || 0); }, 0);

    /* ---- 清单（给商家看） ---- */
    var bom = lines.map(function (l) {
      return { name: l.name, spec: l.spec, qty: l.qty, price: l.price, kw: l.kw };
    });

    var d = {
      sheet: sheet, rail: rail, hinge: hinge, lid: lid, feet: feet,
      t: t, N: N, Wi: Wi, Di: Di, Hi: Hi,
      Wo: Wo, Do: Do, Hl: Hl, H: H,
      doors: doors, doorW: doorW, doorH: doorH, hingesPerDoor: hingesPerDoor,
      hingeCount: hingeCount, doorKg: doorKg, holdCap: holdCap,
      endcaps: endcaps, pins: pins,
      area: area, areaSide: areaSide, areaBack: areaBack, areaBase: areaBase,
      areaDoor: areaDoor, areaLid: areaLid,
      cutAc: cutAc, cutAl: cutAl, cutAcTotalM: cutAcTotalM, cutAlTotalM: cutAlTotalM,
      lines: lines, bom: bom, parts: parts,
      total: total, totalMin: Math.round(total * 0.82), totalMax: Math.round(total * 1.22),
      warnings: warnings, notes: notes,
      weight: N * (sheetKg(Wo, Do, t) + 2 * sheetKg(Do, Hl, t) + sheetKg(Wi, Hl, t) + doors * sheetKg(doorW, doorH, t)) +
              (lid.th > 0 ? sheetKg(Wo, Do, t) : 0),
      explain: "内空 " + Wi + "×" + Di + "×" + Hi + " mm → 外廓 " + Wo + "×" + Do + "×" + H + " mm（" +
        N + " 层 × 单层 " + Hl + " mm + " + (lid.th ? "顶盖 " + lid.th + " mm + " : "") + "脚 " + feet.h + " mm）；" +
        "每层 " + (doors === 1 ? "单扇门" : doors === 2 ? "双开门" : "无门") +
        (doors ? " " + doorW + "×" + doorH + " mm，约 " + doorKg.toFixed(2) + " kg" : "") + "。"
    };

    return d;
  }

  /* ---------------- 装配步骤 ---------------- */
  function buildSteps(p) {
    var hinge = HINGES[p.hinge] || HINGES.friction;
    var rail = RAILS[p.rail] || RAILS["2020"];
    var steps = [];
    var n = 0;
    function step(title, desc, check) { n++; steps.push({ n: n, title: title, desc: desc, check: check || "" }); }

    step("收货核对",
      "先点件：亚克力盒体 " + p.N + " 个（侧/后/底板已粘好）、门板 " + (p.doors * p.N) + " 片、顶盖 " +
        (p.lid.th ? "1 片" : "无") + "、" + rail.label + " " + (p.N + (p.lid.th ? 1 : 0)) + " 根、" +
        "合页 " + p.hingeCount + " 个、端盖 " + p.endcaps + " 个、定位销 " + p.pins + " 个。",
      "亚克力表面无划痕、无气泡；盒体对角线误差 ≤ 1 mm");

    step("处理切口",
      "所有亚克力边缘用 400 目砂纸轻磨去毛刺（别用锉刀，会崩边）；铝梁两端用锉刀倒角，免得刮手。",
      "手指划过边缘不割手");

    if (p.doors) {
      step("门板钻孔（关键）",
        "每扇门沿上边缘量 " + (p.hingesPerDoor === 2 ? "两侧各留 40 mm" : "两侧各留 40 mm、中间居中") +
          "，打 " + p.hingesPerDoor + " 组 φ4.2 通孔（合页底座孔距按实物量）。钻头低速、边钻边滴水，下面垫木块。",
        "孔位都在一条直线上，误差 ≤ 0.5 mm；孔口无放射裂纹");
    }

    step("装第一层的铝梁",
      "铝梁放在第一层盒体的前沿上沿，前表面与侧板前缘齐平；两端各用 1 颗 M4×10 从侧板外侧拧进梁端" +
        (p.rail === RAILS.flat ? "（端面已攻 M4）" : "（2020 用 T 螺母，或直接自攻）") + "。",
      "梁与侧板齐平、不晃动；两端螺丝都咬住");

    if (p.doors) {
      step("把合页装到铝梁上",
        "合页底座用 M4×8 沉头 + 尼龙螺母固定在铝梁下表面，间距与门板孔位对齐；先别拧死。",
        "两个合页轴心同高（用直尺比一下）");
      step("挂门、调缝",
        "门板孔对准合页，M4×8 + 尼龙螺母穿过；门自然下垂后缝隙应上下均匀，再逐颗拧紧。",
        "门缝 1.5–2 mm 均匀；手推门到 30°/60°/90° 松手，能停住不掉");
    }

    if (p.N > 1) {
      step("叠层 + 定位销",
        "第二层盒体底板上按四角打 φ6 盲孔（深 6 mm），放进定位销，再对准第一层的四角放下；" +
          "层数多的话每层再贴 4 段 20 mm 的 3M VHB 双面胶。",
        "叠上去后四个方向推不动、缝隙均匀");
      step("逐层重复",
        "每加一层：装铝梁 → 装合页 → 挂门 → 叠下一层。加层过程中别把已装好的门当把手。",
        "每层门都能独立悬停，互不干涉");
    }

    if (p.lid.th) {
      step("装顶盖",
        "顶盖直接坐在最上层盒体上，四边各留 0.5 mm；想更整体的话加一根压条压在顶盖前沿。",
        "顶盖不翘边、不晃");
    }

    step("装脚 + 验收",
      "底面四角贴脚垫（或拧铝脚），整箱放到平整台面上；把最重的藏品放最下层。",
      "整箱不晃；每扇门从 90° 松手都能停住；层间无相对滑动");

    var tools = ["内六角扳手（M4）", "手电钻 + φ4.2 / φ3 / φ6 钻头", "400 目砂纸", "美纹纸 + 记号笔", "水平尺（或手机水平仪）"];
    if (p.doors) tools.push("小号十字螺丝刀");
    if (p.rail === RAILS.flat) tools.push("M4 丝锥 + 铰手（自己攻丝才用）");

    var pitfalls = [
      "亚克力钻孔必须低速 + 滴水：转速一高就熔、就裂，宁可分三次钻。",
      "合页螺丝别直接拧进 5 mm 亚克力端面：一定要穿通孔 + 尼龙螺母，否则一层一层裂给你看。",
      "任意停合页绝对不能上油/上 WD-40：里面的摩擦片一滑，门就再也停不住。",
      "亚克力胶别用 502：会发白、会开裂；只能用二氯甲烷类专用胶，且要在通风处操作。",
      "层间只靠定位销不够：3 层以上加 VHB 胶或每层四角补一颗 M4 沉头，否则搬动时整摞会错位。",
      "门板装反（手指槽朝下）会挡住掀门：槽一定在上边缘。"
    ];

    return {
      intro: "按当前方案（" + p.N + " 层，" + p.Wo + "×" + p.Do + "×" + p.H + " mm）生成，一个人约 2 小时，只有钻门孔这一步需要点耐心。",
      steps: steps, tools: tools, pitfalls: pitfalls,
      keyNumbers: [
        { k: "外廓", v: p.Wo + "×" + p.Do + "×" + p.H },
        { k: "单层高", v: p.Hl + " mm" },
        { k: "门板", v: p.doors ? p.doorW + "×" + p.doorH : "无门" },
        { k: "亚克力", v: p.area.toFixed(2) + " ㎡" },
        { k: "铝梁", v: p.cutAlTotalM.toFixed(2) + " m" },
        { k: "合页", v: p.hingeCount + " 个" }
      ]
    };
  }

  /* ---------------- 文本 / CSV ---------------- */
  function toText(p) {
    var L = [];
    L.push("【亚克力展示盒 · 悬停面板】");
    L.push(p.explain);
    L.push("");
    L.push("— 亚克力切料（" + p.sheet.label + "）—");
    p.cutAc.forEach(function (c) { L.push(c.name + "：" + c.len + " × " + c.qty + " 片（" + c.group + "）"); });
    L.push("合计 " + p.cutAcTotalM.toFixed(2) + " m 切割 + " + p.area.toFixed(2) + " ㎡");
    L.push("");
    L.push("— 铝梁 —");
    p.cutAl.forEach(function (c) { L.push(c.name + "：" + c.len + " mm × " + c.qty + " 根"); });
    L.push("");
    L.push("— 采购 —");
    p.lines.forEach(function (l) { L.push(l.name + " ｜ " + l.spec + " ｜ " + l.qty + " ｜ ¥" + l.price); });
    L.push("");
    L.push("合计 ≈ ¥" + p.total + "（区间 " + p.totalMin + "–" + p.totalMax + "）");
    return L.join("\n");
  }

  function toCSV(p) {
    var rows = [["类别", "名称", "规格", "数量", "金额", "搜索词"]];
    p.lines.forEach(function (l) { rows.push(["材料", l.name, l.spec, l.qty, l.price, l.kw || ""]); });
    rows.push(["合计", "", "", "", p.total, ""]);
    return rows.map(function (r) {
      return r.map(function (c) { return '"' + String(c).replace(/"/g, '""') + '"'; }).join(",");
    }).join("\r\n");
  }

  var api = {
    SHEETS: SHEETS, RAILS: RAILS, HINGES: HINGES, LIDS: LIDS, FEETS: FEETS,
    PRICE: PRICE, DENSITY: DENSITY,
    computeDisplay: computeDisplay, buildSteps: buildSteps, toText: toText, toCSV: toCSV
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  global.DisplayCore = api;
})(typeof window !== "undefined" ? window : this);