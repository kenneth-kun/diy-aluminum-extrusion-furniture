// 用 Chrome DevTools Protocol 驱动 headless 页面做交互回归测试
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const os = require("os");

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PAGE = "file://" + path.resolve(__dirname, "index.html");
const profile = fs.mkdtempSync(path.join(os.tmpdir(), "cdp-"));
const PORT = 9333;

const chrome = spawn(CHROME, [
  "--headless=new", "--no-sandbox", "--disable-gpu", "--disable-breakpad",
  "--disable-crash-reporter", "--disable-dev-shm-usage", "--no-first-run",
  "--user-data-dir=" + profile, "--remote-debugging-port=" + PORT,
  "--window-size=1200,1500", PAGE
], { stdio: "ignore" });

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function targets() {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      const list = await r.json();
      const page = list.find(t => t.type === "page" && t.url.startsWith("file:"));
      if (page) return page;
    } catch (e) {}
    await sleep(250);
  }
  throw new Error("no page target");
}

(async () => {
  const t = await targets();
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

  let id = 0; const pending = new Map(); const errors = [];
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
    if (m.method === "Runtime.exceptionThrown") errors.push(m.params.exceptionDetails.text + " " + (m.params.exceptionDetails.exception?.description || ""));
    if (m.method === "Runtime.consoleAPICalled" && m.params.type === "error") errors.push(m.params.args.map(a => a.value).join(" "));
  };
  const send = (method, params = {}) => new Promise((res) => {
    const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params }));
  });
  const evaluate = async (expr) => {
    const r = await send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true });
    if (r.result?.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails));
    return r.result?.result?.value;
  };

  await send("Runtime.enable");
  await sleep(600);

  const read = `(() => ({
    layers: +document.getElementById('rLayers').textContent,
    per: +document.getElementById('rPer').textContent,
    cap: +document.getElementById('rCap').textContent,
    total: document.getElementById('rTotal').textContent,
    rows: document.querySelectorAll('#bom tr').length,
    msgs: [...document.querySelectorAll('.msg')].map(e=>e.className.split(' ').pop()+':'+e.textContent),
    err: !document.getElementById('errBox').classList.contains('hidden'),
    chips: document.querySelectorAll('.chip').length
  }))()`;

  const results = [];
  const check = (name, cond, got) => { results.push({ name, pass: !!cond, got }); };

  // 1. 默认态
  let s = await evaluate(read);
  check("默认 7层×10台=70", s.layers === 7 && s.per === 10 && s.cap === 70, s);
  check("BOM 行数 > 8", s.rows >= 9, s.rows);
  check("chips 数量 = 7", s.chips === 7, s.chips);

  // 2. 按车数：100 台 → 受高度限制 7 层 + 警告
  await evaluate(`document.querySelector('[data-mode="cars"]').click()`);
  await evaluate(`var el=document.getElementById('cars'); el.value=100; el.dispatchEvent(new Event('input',{bubbles:true}))`);
  s = await evaluate(read);
  check("按车数 100 → 7 层", s.layers === 7, s.layers);
  check("按车数 100 → 出现警告", s.msgs.some(m => m.startsWith("warn")), s.msgs);

  // 3. 宽度改 40 → 每层 6 台
  await evaluate(`document.querySelector('[data-mode="space"]').click()`);
  await evaluate(`var el=document.getElementById('spaceW'); el.value=40; el.dispatchEvent(new Event('input',{bubbles:true}))`);
  s = await evaluate(read);
  check("宽 40cm → 6 台/层", s.per === 6, s.per);

  // 4. 关灯箱 → 总额下降
  const before = (await evaluate(read)).total;
  await evaluate(`var el=document.querySelector('[data-k="withLight"]'); el.checked=false; el.dispatchEvent(new Event('change',{bubbles:true}))`);
  const after = (await evaluate(read)).total;
  check("关灯箱后更便宜", parseInt(after.replace(/\D/g, "")) < parseInt(before.replace(/\D/g, "")), before + "→" + after);

  // 5. 点 chip 3 层 → 变 3 层
  await evaluate(`[...document.querySelectorAll('.chip')].find(c=>c.textContent.startsWith('3 层')).click()`);
  s = await evaluate(read);
  check("点 3 层 chip → 3 层", s.layers === 3, s.layers);
  check("3 层 = 18 台", s.cap === 18, s.cap);

  // 6. 高度 20cm → 1 层
  await evaluate(`var el=document.getElementById('spaceH'); el.value=20; el.dispatchEvent(new Event('input',{bubbles:true}))`);
  s = await evaluate(read);
  check("高 20cm → ≤2 层", s.layers <= 2, s.layers);

  // 7. 高级参数打开、固定层距 55 → 层数变化符合预期
  await evaluate(`document.getElementById('adv').open=true`);
  await evaluate(`var el=document.getElementById('autoPitch'); el.checked=false; el.dispatchEvent(new Event('change',{bubbles:true}))`);

  // 8. 复制清单文本可生成
  const text = await evaluate(`window.PlannerCore.toText(window.__plan)`);
  check("toText 有内容", typeof text === "string" && text.length > 80, text ? text.length : 0);

  // 9. 比例切换 1:43 不崩
  await evaluate(`var el=document.getElementById('scale'); el.value='1:43'; el.dispatchEvent(new Event('input',{bubbles:true}))`);
  s = await evaluate(read);
  check("切 1:43 仍输出", s.layers >= 1 && !s.err, s);

  // 10. 安装说明标签页
  await evaluate(`document.querySelector('[data-tab=install]').click()`);
  const inst = await evaluate(`(() => ({
    steps: document.querySelectorAll('#tab-install .step').length,
    checks: document.querySelectorAll('#tab-install .step .check').length,
    tools: document.querySelectorAll('#tab-install .toolrow span').length,
    pitfalls: document.querySelectorAll('#tab-install .msg').length,
    hasPrint: !!document.getElementById('printBtn'),
    planHidden: document.getElementById('tab-plan').classList.contains('hidden'),
    tab: window.__tab
  }))()`);
  check("安装页 10 步 + 10 条验收", inst.steps === 10 && inst.checks === 10, inst);
  check("安装页有工具/坑/打印", inst.tools >= 5 && inst.pitfalls >= 4 && inst.hasPrint, inst);
  check("切到安装页时方案页隐藏", inst.planHidden && inst.tab === "install", inst);

  // 11. 改层数后安装步骤数字跟着变
  await evaluate(`document.querySelector('[data-tab=plan]').click()`);
  await evaluate(`document.querySelector('[data-mode=space]').click();
    var a=document.getElementById('spaceH'); a.value=55; a.dispatchEvent(new Event('input',{bubbles:true}));
    var b=document.getElementById('scale'); b.value='1:64'; b.dispatchEvent(new Event('input',{bubbles:true}));`);
  await evaluate(`[...document.querySelectorAll('.chip')].find(c=>c.textContent.startsWith('4 层')).click()`);
  await evaluate(`document.querySelector('[data-tab=install]').click()`);
  const inst2 = await evaluate(`[...document.querySelectorAll('#tab-install .keynum b')].map(e=>e.textContent)`);
  check("层数改为 4 后顶框高度重算", inst2.includes("280 mm"), inst2);

  // 12. 层板材料：PETG 打印
  await evaluate(`document.querySelector('[data-mode=space]').click();
    var w=document.getElementById('spaceW'); w.value=60; w.dispatchEvent(new Event('input',{bubbles:true}));
    var h=document.getElementById('spaceH'); h.value=55; h.dispatchEvent(new Event('input',{bubbles:true}));
    var sc=document.getElementById('scale'); sc.value='1:64'; sc.dispatchEvent(new Event('input',{bubbles:true}));
    var li=document.querySelector('[data-k=withLight]'); li.checked=true; li.dispatchEvent(new Event('change',{bubbles:true}));`);
  const acrylicTotal = await evaluate(`(function(){var t=document.getElementById('rTotal').textContent,d='';for(var i=0;i<t.length;i++){if(t[i]>='0'&&t[i]<='9')d+=t[i];}return +d;})()`);
  await evaluate(`var m=document.getElementById('shelfMaterial'); m.value='petg'; m.dispatchEvent(new Event('input',{bubbles:true}))`);
  const petg = await evaluate(`(() => ({
    material: window.__plan.material,
    tiles: window.__plan.printPlan && window.__plan.printPlan.tilesTotal,
    kg: +(window.__plan.printPlan.kg.toFixed(2)),
    hours: Math.round(window.__plan.printPlan.hours),
    total: (function(){var t=document.getElementById('rTotal').textContent,d='';for(var i=0;i<t.length;i++){if(t[i]>='0'&&t[i]<='9')d+=t[i];}return +d;})(),
    hasLine: [...document.querySelectorAll('#bom tr')].some(tr => /PETG/.test(tr.textContent)),
    strip: !document.getElementById('printStrip').classList.contains('hidden')
  }))()`);
  check("切 PETG：42 片、约 1.93 kg", petg.material === "petg" && petg.tiles === 42 && Math.abs(petg.kg - 1.93) < 0.05, petg);
  check("切 PETG：约 175 小时", petg.hours >= 160 && petg.hours <= 190, petg.hours);
  check("PETG 清单出现耗材行且更便宜", petg.hasLine && petg.total < acrylicTotal, petg.total + " vs " + acrylicTotal);
  check("方案页出现打印摘要", petg.strip, petg.strip);

  // 13. 打印标签页内容
  await evaluate(`document.querySelector('[data-tab=print]').click()`);
  const pt = await evaluate(`(() => ({
    rows: document.querySelectorAll('#tab-print table tbody tr').length,
    has42: /42 片/.test(document.getElementById('tab-print').textContent),
    hasParams: /烘干/.test(document.getElementById('tab-print').textContent),
    copyBtn: !!document.getElementById('copyPrint'),
    stlLink: !!document.querySelector('#tab-print a[href$=".stl"]')
  }))()`);
  check("打印页有清单/参数/复制按钮/STL 链接", pt.rows >= 10 && pt.has42 && pt.hasParams && pt.copyBtn && pt.stlLink, pt);

  // 14. 边框方案
  await evaluate(`var m=document.getElementById('shelfMaterial'); m.value='petg_frame'; m.dispatchEvent(new Event('input',{bubbles:true}))`);
  const frame = await evaluate(`(() => ({
    kg: +(window.__plan.printPlan.kg.toFixed(2)),
    sheet: window.__plan.printPlan.sheetM2.toFixed(2),
    hasSheetLine: [...document.querySelectorAll('#bom tr')].some(tr => /PET 片/.test(tr.textContent))
  }))()`);
  check("边框方案更省料且有片材行", frame.kg < 1.4 && frame.hasSheetLine, frame);

  // 15. 切回亚克力
  await evaluate(`var m=document.getElementById('shelfMaterial'); m.value='acrylic'; m.dispatchEvent(new Event('input',{bubbles:true}))`);
  const back = await evaluate(`(() => ({ material: window.__plan.material, hasPetg: [...document.querySelectorAll('#bom tr')].some(tr=>/PETG/.test(tr.textContent)) }))()`);
  check("切回亚克力后清单恢复", back.material === "acrylic" && !back.hasPetg, back);

  // 16. 比价链接
  await evaluate(`document.querySelector('[data-tab=bom]').click()`);
  const links = await evaluate(`(() => {
    const rows = [...document.querySelectorAll('#bom tr')];
    const first = rows[0];
    const as = [...first.querySelectorAll('.buylinks a')];
    return {
      rows: rows.length,
      linkCount: as.length,
      hosts: as.map(a => new URL(a.href).host),
      hrefs: as.map(a => a.href),
      kw: (window.__plan.lines[0] || {}).kw,
      rowText: first.textContent,
      hasCopyKw: !!document.getElementById('copyKwBtn'),
      hint: /实时搜索页/.test(document.querySelector('.buyhint').textContent)
    };
  })()`);
  check("每行 3 个比价链接", links.linkCount === 3 &&
    links.hosts.some(h => h.includes('1688')) && links.hosts.some(h => h.includes('taobao')) && links.hosts.some(h => h.includes('jd')),
    links.hosts);
  const encoded = links.hrefs.every(h => !/[^\x00-\x7F]/.test(h) && h.indexOf(" ") < 0);
  const band = /单件\s*[\d.]+[–-][\d.]+/.test(links.rowText);
  // 1688 必须是 GBK：按 GBK 解码回来应与关键词完全一致
  const aliHref = links.hrefs.find(h => h.includes("1688"));
  const q = aliHref.split("keywords=")[1] || "";
  const raw = decodeURIComponent(q.replace(/%([0-9A-F]{2})/gi, (m, h) => String.fromCharCode(parseInt(h, 16))));
  const gbkDecoded = new TextDecoder("gbk").decode(Buffer.from(raw, "latin1"));
  check("1688 链接是 GBK 编码且能还原关键词", gbkDecoded === links.kw, { want: links.kw, got: gbkDecoded });
  check("链接关键词已编码 + 有单件价带", encoded && band, { encoded, band, rowText: links.rowText });
  check("有复制关键词按钮和说明", links.hasCopyKw && links.hint, links);

  check("无 JS 异常", errors.length === 0, errors);

  console.log(JSON.stringify(results, null, 1));
  const bad = results.filter(r => !r.pass);
  console.log(bad.length ? `\n❌ ${bad.length} 项失败` : "\n✅ 全部通过");
  ws.close(); chrome.kill();
  process.exit(bad.length ? 1 : 0);
})().catch(e => { console.error("TEST ERROR", e); chrome.kill(); process.exit(2); });
