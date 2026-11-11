# model-prices

OpenCode Desktop GUI 插件：在会话里显示模型价格。

## 功能

- 会话侧边栏面板 **Model prices**：列出当前项目可用模型，显示上下文窗口、输入 / 输出 / 缓存读写单价（USD / 1M tokens），支持搜索、按输入价 / 输出价 / 名称排序，并可切换正序 / 倒序；点击行直接切换模型。
- 默认隐藏免费模型（所有计价档 input 均为 0），点工具栏的 **free** 可临时显示，并提示隐藏了多少个。
- 会话标题栏小徽章：显示当前模型的输入 / 输出单价（紧凑模式下更短）。
- 命令面板 / 斜杠命令 `/prices` 可打开面板。

## 入口

- 打开方式：会话侧栏 **+** 菜单 → **Model prices**；或 `Ctrl+P` → `Model prices`；或输入 `/prices`。
- 插件开关：Desktop **Settings > Extensions > Plugins**。

## 目录

```text
~/.config/opencode/model-prices/
├── server.js               # 最小服务端入口，让插件被 OpenCode 识别为 active
├── src/gui.tsx             # GUI 插件源码
├── vite.config.ts
├── dist/gui-experimental.cjs
└── package.json            # exports ./gui-experimental
```

配置在 `~/.config/opencode/opencode.jsonc`：

```jsonc
{
  "plugins": ["./model-prices"],
}
```

## 修改后重新构建

```bash
cd ~/.config/opencode/model-prices
npm install   # 新克隆的环境先安装依赖
npm run build
```

`dist/gui-experimental.cjs` 已纳入版本控制，克隆后无需先构建即可被 OpenCode 直接加载。修改 `src/gui.tsx` 后需要重新构建，并把 `src/` 和 `dist/` 一起提交。

## Git 仓库

本目录是一个独立的 Git 仓库，默认分支为 `main`，`node_modules/` 已被忽略。

添加远程仓库并推送：

```bash
git remote add origin <repo-url>
git push -u origin main
```

GUI 插件 API 目前标记为 experimental，桌面端升级后如果布局或接口有变化，可能需要跟着调整。
