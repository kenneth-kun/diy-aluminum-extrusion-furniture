/* 四套方案 + 资料索引：首页卡片和搜索都读这里，改一处即可 */

export const SCHEMES = [
  {
    id: "shelf",
    no: "01",
    kind: "光轴 + 亚克力",
    title: "光轴展示架",
    tag: "层数规划器",
    blurb: "4 根 φ10 光轴 + 十字夹，层数按你的柜格和车模比例自动排；整层可抽出来换车。",
    cost: "¥1153",
    specs: [
      { k: "层数", v: "7 层" },
      { k: "外廓", v: "580×280" },
      { k: "工期", v: "约 3 h" }
    ],
    href: "#/shelf",
    doc: "材料清单.md",
    docLabel: "材料清单 + 尺寸图",
    thumb: "./media/thumb-shelf.png",
    keys: "光轴 亚克力 车模 展示架 层板 十字夹 1:64 风火轮 手办 柜格 层数"
  },
  {
    id: "cabinet",
    no: "02",
    kind: "铝型材 + 不锈钢",
    title: "铝型材抽屉柜",
    tag: "切料规划器",
    blurb: "2020 自成抽屉框 + 3030 立柱，三节导轨、亚克力长虹面板，配 1.2 mm 不锈钢台面。",
    cost: "¥1217",
    specs: [
      { k: "抽屉", v: "4 抽" },
      { k: "外廓", v: "450×400" },
      { k: "工期", v: "约 4.5 h" }
    ],
    href: "#/cabinet",
    doc: "铝型材柜.md",
    docLabel: "铝型材柜说明书",
    thumb: "./media/thumb-cabinet.png",
    keys: "铝型材 抽屉柜 导轨 不锈钢台面 长虹 亚克力 2020 3030 角码 收纳 工具柜"
  },
  {
    id: "tray",
    no: "03",
    kind: "2020 + 塑料盆",
    title: "桌面收纳柜",
    tag: "盆位规划器",
    blurb: "现成工业塑料盆直接坐在托梁上抽拉，无导轨。层距按盆高自动算，荧光绿端盖配色。",
    cost: "¥303",
    specs: [
      { k: "层数", v: "3 层" },
      { k: "外廓", v: "455×355" },
      { k: "工期", v: "约 1.5 h" }
    ],
    href: "#/tray",
    doc: "铝型材桌面柜.md",
    docLabel: "桌面柜说明书",
    thumb: "./media/thumb-tray.png",
    keys: "桌面 收纳柜 塑料盆 2020 端盖 琥珀 顶板 配色 零件盒 螺丝 玩具收纳"
  },
  {
    id: "display",
    no: "04",
    kind: "亚克力盒 + 任意停",
    title: "亚克力展示盒",
    tag: "悬停面板",
    blurb: "每层一个粘好的亚克力盒，前沿一根铝梁挂两片任意停合页，门停在任意角度。加层 = 再叠一个。",
    cost: "¥711",
    specs: [
      { k: "层数", v: "3 层" },
      { k: "总高", v: "814 mm" },
      { k: "工期", v: "约 2 h" }
    ],
    href: "#/display",
    doc: "亚克力展示盒.md",
    docLabel: "展示盒说明书",
    thumb: "./media/thumb-display.png",
    keys: "亚克力 展示盒 手办 潮玩 球鞋 合页 任意停 悬停 门 5mm 层数 扩展"
  }
];

export const DOC_GROUPS = [
  {
    title: "说明书（先读这个）",
    items: [
      { label: "README", what: "总览 + 目录 + 测试说明", href: "./docs/README.md", keys: "readme 总览 目录 测试" },
      { label: "材料清单.md", what: "光轴展示架的完整采购与尺寸", href: "./docs/材料清单.md", keys: "材料 清单 光轴 采购 尺寸" },
      { label: "铝型材柜.md", what: "抽屉柜结构、公式、下单话术", href: "./docs/铝型材柜.md", keys: "铝型材 抽屉柜 公式 话术" },
      { label: "铝型材桌面柜.md", what: "桌面柜 10 节说明书", href: "./docs/铝型材桌面柜.md", keys: "桌面柜 收纳 盆" },
      { label: "亚克力展示盒.md", what: "展示盒 10 节说明书", href: "./docs/亚克力展示盒.md", keys: "展示盒 亚克力 合页" },
      { label: "打包与发布.md", what: "桌面图标、GitHub Pages、FAQ", href: "./docs/打包与发布.md", keys: "发布 打包 github pages 图标" }
    ]
  },
  {
    title: "图纸与表格",
    items: [
      { label: "尺寸图.png", what: "光轴架的标注尺寸图", href: "./docs/尺寸图.png", keys: "尺寸 图 png 标注" },
      { label: "采购清单.csv", what: "可直接导入表格的清单", href: "./docs/采购清单.csv", keys: "采购 csv 清单 表格" },
      { label: "petg/", what: "3D 打印的 STL、切片参数与预览", href: "./docs/petg/README.md", keys: "petg 3d 打印 stl 切片 bim 文件" }
    ]
  }
];