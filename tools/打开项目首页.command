#!/bin/bash
# 双击打开「自制家具」项目首页
# 用法：双击本文件；或终端执行 ./打开项目首页.command
#      加 --check 只打印解析到的项目目录，不打开浏览器
set -u

SRC="${BASH_SOURCE[0]:-$0}"

# 解析真实路径（本文件可能被桌面上的软链接/替身引用）
if command -v python3 >/dev/null 2>&1; then
  REAL="$(python3 -c 'import os,sys; print(os.path.realpath(sys.argv[1]))' "$SRC" 2>/dev/null || echo "$SRC")"
else
  REAL="$SRC"
fi

DIR="$(cd "$(dirname "$REAL")" && pwd -P)"

# 兜底：如果脚本被单独复制到别处（桌面/下载），按常见位置找项目
if [ ! -f "$DIR/index.html" ]; then
  for d in \
    "$HOME/Documents/deepseek-harness/default-workspace/光轴置物架" \
    "$HOME/Desktop/光轴置物架" \
    "$HOME/Downloads/光轴置物架"; do
    if [ -f "$d/dist/index.html" ]; then DIR="$d"; break; fi
  done
fi

if [ ! -f "$DIR/dist/index.html" ]; then
  echo "✗ 没找到 dist/index.html（先 npm run build）"
  echo "  当前目录：$DIR"
  echo "  项目好像被移动或改名了，请重新生成桌面快捷方式："
  echo "  tools/创建桌面快捷方式.command"
  [ -t 0 ] && read -r -n 1 -s -p "按任意键关闭…"
  exit 1
fi

if [ "${1:-}" = "--check" ]; then
  echo "$DIR"
  exit 0
fi

open "$DIR/dist/index.html"