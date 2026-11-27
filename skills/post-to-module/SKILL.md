---
name: post-to-module
description: 把一条帖子（小红书 / 微博 / B 站 / YouTube / 抖音，图片或视频）变成这个「自制家具规划器」项目里的一个新模块：抓图判读结构 → 写内核与 SVG 正视图 → 加 Vue 页面与路由 → 补测试与说明书 → 首页接入 → 构建发布。当用户发来一个链接并说「这个也加进系统」「多加一个模块」「照着这个做一套」「把这个帖子做成方案」「有新方案了」「同等待遇来一个」时使用；即使用户只贴了一个 URL 没多说话，只要是往这套家具规划器里加东西，都用本 Skill。
description_zh: 一条帖子链接 → 项目里多一个完整模块（结构判读、内核、图纸、页面、测试、文档、首页、发布）。
description_en: Turn one social-media post link into a complete new module (core math, SVG drawing, Vue page, tests, docs, hub card, deploy) in the DIY furniture planner.
version: 1.0.0
allowed-tools: Read,Write,Bash,Edit,Glob,Grep
---

# 帖子 → 新模块（post-to-module）

把「刷到一条好看的帖子」变成「系统里多一套能算、能下单、能装、能分享的方案」。
本项目（`光轴置物架/`，Vue 3 + Vite 单页应用）已经这样接过四套：光轴展示架、铝型材抽屉柜、桌面收纳柜、亚克力展示盒。这四套的结构、命名、文件位置就是模板——**新增模块 = 照抄形状，换数学**。

## 0. 契约（先讲清要产出什么）

| 输入 | 说明 |
|---|---|
| 帖子 URL | 必填。图片笔记或视频笔记都行 |
| 可选项 | 目标尺寸/预算/材料偏好、放什么（手办/鞋/文件/杂物）、放在哪（桌面/柜格/整面墙） |

| 产出 | 路径（相对 `光轴置物架/`） |
|---|---|
| 计算内核 | `src/cores/<id>.js`（ESM，纯函数，Node 可跑） |
| 正视图 | `src/draw/<id>.js`（返回 SVG 字符串） |
| 页面 | `src/views/<Name>View.vue`（四页签：方案/切料表/采购/装配） |
| 内核测试 | `tests/<id>.test.js` |
| DOM 测试 | `tests/run-dom-tests.sh` 追加一段 |
| 说明书 | `<中文名>.md`（十节，见 §8） |
| 首页卡片 | `src/data/schemes.js` 的 `SCHEMES` + `public/media/thumb-<id>.png` |
| 接线 | `src/router.js`、`src/App.vue`、`vite.config.js` 的 `DOC_FILES`、`README.md` |

命名约定：`id` 用小写英文单词（`shelf` / `cabinet` / `tray` / `display`）；路由 `#/<id>`；localStorage 键 `diy:<id>:v2`；文档用中文名。

---

## 1. 抓取：先把图和文字拿到本地

```bash
bash scripts/grab.sh "<帖子URL>" /tmp/post-<id>      # 输出：meta.txt / img/*.jpg 或 v.mp4 + frames/
```

要点（脚本已内置，失败时手动补）：

- **小红书**：`/explore/<noteId>` 常常空壳，改用 `/discovery/item/<noteId>?xsec_token=...&xsec_source=pc_collect`；token 末尾的 `=` 要写成 `%3D`。
- **图片 URL**：不要去解析 `imageList` 那个 JSON 片段（正则只截 600 字符，取不到），直接全页扫 `//sns-webpic[^"\s\\]*`，形如 `http://sns-webpic-qc.xhscdn.com/<ts>/<hash>/1040g2sg...!h5_1080jpg`。
- **视频笔记**：正文里有 `"type":"video"`，`masterUrl` 常有两档（259p/537p），整条 URL 约 140 字符带 sign，别截断。下载后**没有 ffmpeg 也能抽帧**：`scripts/frames.swift`（AVFoundation）+ `swiftc -O -module-cache-path /tmp/swift-mc`，再用 `scripts/montage.swift` 拼成 4 列网格一次看 12 帧。
- 图片检查：`sips -g pixelWidth -g pixelHeight`；拼图/裁剪统一用 `sips -c H W --cropOffset top left`（扩展名要和真实格式一致，否则 `read_image` 报 declaration mismatch）。

## 2. 判读：把帖子读成一张结构表

对着图/帧回答这五行，写成表格放进后续文档第一节：

| 项 | 要写清楚 |
|---|---|
| 骨架 | 型材/光轴/板材的规格与长度数量（2020、3030、φ10 光轴、5 mm 亚克力…） |
| 连接 | 角码 + T 螺母、十字夹、任意停合页、粘接、定位销——**每一个都问「要不要打孔」** |
| 承重 | 力怎么传到地面/桌面；哪一根是受弯件 |
| 加工 | 需要卖家做的（切割/攻丝/激光/热弯）与你自己做的（拧螺丝/粘/钻） |
| 可调 | 哪个尺寸能改、层数能不能加、颜色/材料有几档 |

再写一句「**为什么这个结构成立**」（四条以内）。这句话决定后面所有公式的边界条件。

判读完成先跟用户对一次口径（图里看不清的地方直接说「我按 X 理解，不对就改」），不要闷头写完才发现方向错了。

## 3. 建模：内核 `src/cores/<id>.js`

照 `references/templates.md` 的骨架写，硬规则：

1. **单位统一 mm**；界面输入 cm，`×10` 再喂内核。
2. **所有外廓与切料尺寸 `floor5()` 向下取整到 5 mm**（宁短不长；装不进去的永远是长的那一根）。派生尺寸用 `round5()`。
3. 常量表放文件顶部：`PROFILES` / `SHEETS` / `HINGES` / `FEETS` / `TOPS` / `CAPFIX` / `PRICE` / `KW`。价格一定带 `label`，界面直接渲染。
4. `compute<X>(input)` 返回：`{ input, dims, cut, panels, lines, total, totalMin, totalMax, warnings, notes, capFix… }`。
   - `lines` 每项 `{ name, spec, qty, u, price|subtotal, lo, hi, kw }`，**kw 必填**（有断言：BOM 每行都要能被搜到）。
   - 价格区间：`totalMin = total × 0.82`、`totalMax = total × 1.22`（四套内核一致）。
5. `buildSteps(p)` 返回 `{ intro, steps: [{n,title,desc,check}], tools: [{name,note}], pitfalls: [{title,text}], keyNumbers: [{k,v}] }`；
   每一步都要有**验收标准**（`check`），工具按方案分支（攻丝才给丝锥）。
6. `toText(p)` / `toCSV(p)` 直接给"复制给卖家"用。
7. `warnings` 讲风险（倾覆、门重、装不下），`notes` 讲工艺（让谁加工、留几毫米余量）——两者别混。

改完立刻 `node -e 'import("./src/cores/<id>.js").then(m=>console.log(m.default.compute({}))).catch(e=>console.error(e))'` 看默认方案数字是否像人话。

## 4. 画图：`src/draw/<id>.js`

- 视图常量 `ML/MR/MT/MB`，`vw = W+ML+MR`、`vh = H+MT+MB`；**用 `X(x)/Y(y)` 映射，不要 `transform: scale(1,-1)`**（文字会镜像）。
- 图例一行放顶部，中文按双宽估宽：`lx += 18 + s.replace(/[^\x00-\xff]/g, "aa").length * 5.6`。
- 尺寸线三处就够：外宽、总高、最关键的那段间距（层距/净高/门高）。
- 配色只用设计 token：铝 `#e9e4d8/#a9a29a`、亚克力 `#e3eef2/#6d97a8`、铜 `#a8512a`、纸底 `#fcfaf4`。

## 5. 页面：`src/views/<Name>View.vue`

以 `src/views/DisplayView.vue` 为母版复制，改参数与文案：

- `persisted("diy:<id>:v2", DEFAULTS, { drop: [...], query: {...} })`；`drop` 放"只影响看图"的状态（如开门角度），否则下次打开还是上次的视角。
- 左栏：`01..0N` 参数组（`FieldNum` / `Seg` / `select` + `hint`），每个 hint 讲清"这个值怎么来的"。
- 右栏 `TabsNav` 四页签：
  - **方案**：`StatBar`(hero 三格 + stat4 四格) → `explain` → `.blueprint-frame.blueprint` 包 `v-html` SVG → `MsgList`
  - **切料表**：型材表 + 板材表，`tfoot` 给总长/总面积，下面两句"下单话术"（端盖三态动态文案）
  - **采购**：`BomTable`（复制清单 / 复制比价关键词 / 下载 CSV / 重置 + 1688/淘宝/京东 三链接）
  - **装配**：`StepsList`（intro + 步骤 + 工具 + 坑）
- 文案禁忌：`.hero3 span` 有 `text-transform: uppercase`，**标签里别写 `mm`**（会变 `MM`），单位放数值里。

## 6. 接线

```js
// src/router.js：ROUTES 加一条
{ path: "/<id>", name: "<id>", no: "05", title: "<中文名>", nav: "<短名>" }
// src/App.vue：VIEWS 映射 + topnav 编号自动
// src/data/schemes.js：SCHEMES.push({...})
```

首页卡片要有：`no`（图纸编号）、`kind`（材料标签）、`title`、`blurb`（一句人话）、`cost`（`¥xxx`）、`specs`（三格）、`thumb`（`./media/thumb-<id>.png`）、`keys`（搜索词，含用户会搜的同义词：手办/球鞋/文件/收纳…）。
缩略图：截 1280 宽 dsf2 的"方案"页 → 裁 `1000×457`（首页 thumb 容器比例）→ `sips -Z 1000`，存 `public/media/thumb-<id>.png`。
`vite.config.js` 的 `DOC_FILES` 记得加新 `.md`（否则离线包里没有说明书）。

## 7. 测试

```bash
npm test            # tests/<id>.test.js 由 package.json 串起来，先加进去
npm run build
npm run test:dom    # 追加一段断言：默认数字、切料话术、采购链接、装配步数、URL 参数、未知值回落
```

内核测试分段（照现有四个文件）：`[1] 默认方案逐项数字`、`[2] 参数变化`、`[3] 边界与 clamp`、`[4] 切料表`、`[5] 五金与价格区间`、`[6] 警告/提示`、`[7] 导出`、`[8] 新增选项（如端盖三态）`。
断言写**具体数字**（`eq("总价", p.total, 711)`），不要只断言"大于 0"——数字才是回归的意义。

## 8. 文档 `<中文名>.md`

十节：① 结构拆解表 + "为什么这个结构成立" ② 尺寸公式（一条条推导，含取整规则） ③ 切料表 + 两段下单话术 ④ 采购清单（明细 + 总价 + 区间）与省钱三法 ⑤ 端盖/五金固定方式（若有） ⑥ 装配 N 步 + 工具 + 时长 ⑦ 六个坑 ⑧ 参数对照表（默认/最小/最大 → 结果怎么变） ⑨ 与其他几套的对比 ⑩ 文件索引 + URL 参数 + 参考（原帖链接）。

同时在 `README.md` 的总表加一行、目录树补一行；首页 `DOC_GROUPS` 里加条目。

## 9. 视觉验收（必看，不是走过场）

```bash
bash scripts/shots.sh <id>          # 四个页签 + 窄屏 + 关键 URL 变体，落在 /tmp/shots/<id>/
```

看五件事：① 四页签都不空 ② SVG 里文字不压线、图例不重叠 ③ hero 三格单位没被大写 ④ 500 px 窄屏参数纵排正常 ⑤ 采购页每行三平台链接都在。

## 10. 发布

```bash
bash scripts/ship.sh "feat: 第五个方案 <中文名>"
```

它做：`npm run build` → `git add -A` → commit（作者 `kenneth-kun`）→ `push origin main` → 用 `dist/` 重建 `gh-pages` 分支。

---

## DoD 清单（少一项都不算完成）

- [ ] `npm test` 全绿，新模块断言是具体数字
- [ ] `npm run test:dom` 全绿，含新模块一段
- [ ] 首页出现新卡片，点击能进 `#/<id>`，缩略图比例正确
- [ ] 四个页签都有内容；切料表的口径和文档一致（同一组数字）
- [ ] 说明书十节齐，含"为什么成立"和六个坑
- [ ] README 总表/目录树/测试数同步
- [ ] 1280 与 500 宽截图都看过
- [ ] 已 push，`gh-pages` 已更新

## 常见坑（踩过的，别再踩）

| 坑 | 处理 |
|---|---|
| 默认 PATH 的 node 是 v14，Vite 7 起不来 | `export PATH=/Users/lilikun/.workbuddy/binaries/node/versions/25.9.0/bin:$PATH` |
| npm 报 `~/.npm/_logs` 不可写 | 加 `--cache /tmp/npmcache` |
| `dist/index.html` 双击白屏 | 构建是 iife + 普通 `defer` 脚本；别把 `type="module"` / `crossorigin` 加回来（file:// 下 CORS 会拦） |
| `--dump-dom` 数 `class="step"` 多出几个 | `<script>` 里的模板字符串也被数进去，先剥 `<script>` 再 grep |
| 截图拿到上一次的状态 | 每次用新的 `--user-data-dir=$(mktemp -d)`；不同参数分开 profile |
| `sips` 裁剪出黑边 | 裁剪框不能超出源图（offset+size ≤ 源尺寸） |
| 打开页面还是上次的开门角度 | 角度类状态 `drop` 掉，别进 localStorage |
| 3030 端面攻 M4 锁不住 | 3030 中心孔 φ6.8（给 M8）；2020 才是 φ4.2=M5 底孔。3030 用卡扣款，或 M8 螺栓 + 扩孔端盖 |
| 1688 关键词乱码 | 用 `src/lib/util.js` 的 GBK 编码器，空格是 `%20` |
| 尺寸四舍五入后装不进去 | 一律 `floor5`；抽屉宽 ≤ 内空宽 − 12.7×2 − 余量 |

## 参考实现（照着抄形状）

| 模块 | 特点 | 抄它什么 |
|---|---|---|
| `src/cores/planner.js` + `views/ShelfView.vue` | 参数耦合最多（比例/空间/车数/预算/打印） | 多模式输入、打印计划、层数 chips |
| `src/cores/cabinet.js` + `views/CabinetView.vue` | 型材 + 板材 + 导轨选型 | 切料表结构、预设 chip、端盖三态话术 |
| `src/cores/tray.js` + `views/TrayView.vue` | 最简（11 个参数就出全套） | 最小可用内核、配色色卡 |
| `src/cores/display.js` + `views/DisplayView.vue` | 门/合页/角度 | 可动件的正视图、`drop` 状态、装配页数字条 |