// 装配示意图：十字夹三步顺序（纯静态 SVG，配色跟随新设计系统）
export const clampFigure = `
<svg viewBox="0 0 760 210" role="img" aria-label="十字夹装配顺序示意">
  <defs><marker id="arx" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#a8512a"/></marker></defs>
  <g transform="translate(10,0)">
    <rect x="96" y="40" width="10" height="150" fill="#efebe2" stroke="#3d454b" stroke-width="1.2"/>
    <rect x="80" y="86" width="42" height="26" rx="2" fill="#c06a3d" opacity="0.75" stroke="#3d454b" stroke-width="1.2"/>
    <circle cx="112" cy="99" r="3.2" fill="#3d454b"/>
    <path d="M101,58 L101,80" stroke="#a8512a" stroke-width="1.6" marker-end="url(#arx)"/>
    <text x="101" y="30" font-size="15" fill="#a8512a" text-anchor="middle" font-weight="bold">① 套夹块</text>
    <text x="101" y="203" font-size="11" fill="#7c7770" text-anchor="middle">开口朝向一致</text>
  </g>
  <g transform="translate(256,0)">
    <rect x="96" y="40" width="10" height="150" fill="#efebe2" stroke="#3d454b" stroke-width="1.2"/>
    <rect x="20" y="92" width="160" height="9" fill="#e6e0d2" stroke="#3d454b" stroke-width="1.2"/>
    <rect x="80" y="86" width="42" height="26" rx="2" fill="#c06a3d" opacity="0.75" stroke="#3d454b" stroke-width="1.2"/>
    <circle cx="112" cy="99" r="3.2" fill="#3d454b"/>
    <path d="M186,96 L210,96" stroke="#a8512a" stroke-width="1.6" marker-end="url(#arx)"/>
    <text x="101" y="30" font-size="15" fill="#a8512a" text-anchor="middle" font-weight="bold">② 穿横杆</text>
    <text x="101" y="203" font-size="11" fill="#7c7770" text-anchor="middle">两端各出头约 10 mm</text>
  </g>
  <g transform="translate(502,0)">
    <rect x="96" y="40" width="10" height="150" fill="#efebe2" stroke="#3d454b" stroke-width="1.2"/>
    <rect x="20" y="92" width="160" height="9" fill="#e6e0d2" stroke="#3d454b" stroke-width="1.2"/>
    <rect x="80" y="86" width="42" height="26" rx="2" fill="#c06a3d" opacity="0.75" stroke="#3d454b" stroke-width="1.2"/>
    <circle cx="112" cy="99" r="3.2" fill="#3d454b"/>
    <path d="M118,42 L131,66" stroke="#8d8778" stroke-width="3"/>
    <path d="M118,42 L131,66" stroke="#c9c5ba" stroke-width="1"/>
    <path d="M112,74 L112,84" stroke="#a8512a" stroke-width="1.6" marker-end="url(#arx)"/>
    <text x="101" y="30" font-size="15" fill="#a8512a" text-anchor="middle" font-weight="bold">③ 手拧锁紧</text>
    <text x="101" y="203" font-size="11" fill="#7c7770" text-anchor="middle">2–3 N·m，别过力</text>
  </g>
</svg>
<figcaption>图 A：十字夹的装配顺序。先套夹块、再穿横杆、最后手拧顶丝；四角开口方向保持一致，后面才好逐层调。</figcaption>
`;