#!/bin/bash
# 在桌面生成一个「自制家具」App 图标，双击直接打开项目首页（不弹终端窗口）
# 重新运行会覆盖旧图标；项目搬家后再点一次即可
set -u

SRC="${BASH_SOURCE[0]:-$0}"
REAL="$(python3 -c 'import os,sys; print(os.path.realpath(sys.argv[1]))' "$SRC")"
DIR="$(cd "$(dirname "$REAL")/.." && pwd -P)"
APP="$HOME/Desktop/自制家具.app"

if [ ! -f "$DIR/index.html" ]; then
  echo "✗ 没找到 $DIR/index.html"
  exit 1
fi

if [ "${1:-}" != "--yes" ]; then
  osascript -e 'display dialog "将在桌面生成「自制家具」图标，双击打开项目首页。" buttons {"取消","生成"} default button "生成"' >/dev/null 2>&1 || { echo "已取消"; exit 0; }
fi

rm -rf "$APP"
osacompile -o "$APP" -e "do shell script \"open \\\"$DIR/index.html\\\"\"" || {
  echo "✗ osacompile 失败"; exit 1; }

# 图标：用项目截图做 1024 方图 → icns
ICON_SRC="$DIR/planner/thumb-shelf.png"
if [ -f "$ICON_SRC" ]; then
  TMP="$(mktemp -d)"
  sips -Z 900 "$ICON_SRC" --out "$TMP/i.png" >/dev/null 2>&1
  sips --padToHeightWidth 1000 1000 --padColor F4F6F8 "$TMP/i.png" --out "$TMP/sq.png" >/dev/null 2>&1
  sips -s format icns "$TMP/sq.png" --out "$TMP/applet.icns" >/dev/null 2>&1
  if [ -f "$TMP/applet.icns" ]; then
    cp "$TMP/applet.icns" "$APP/Contents/Resources/applet.icns"
    touch "$APP"
    # 让 Finder 重新读取图标缓存
    /usr/bin/SetFile -a C "$APP" 2>/dev/null || true
  fi
  rm -rf "$TMP"
fi

# 额外放一个「打开项目首页.command」的软链接，方便在终端里用
ln -sf "$DIR/tools/打开项目首页.command" "$HOME/Desktop/打开项目首页.command" 2>/dev/null || true

echo "✓ 已生成：$APP"
echo "  指向：$DIR/index.html"
open -R "$APP"