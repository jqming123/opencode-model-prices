# model-prices

OpenCode Desktop GUI 插件：在会话里显示模型价格。

仓库：<https://github.com/jqming123/opencode-model-prices>

需要支持 `./gui-experimental` 的 OpenCode Desktop 2.x。

## 安装

推荐用 Git 直装。

```bash
opencode plugin add git+https://github.com/jqming123/opencode-model-prices.git
```

也可以在全局 `~/.config/opencode/opencode.jsonc` 的 `plugins` 里手动添加：

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["git+https://github.com/jqming123/opencode-model-prices.git"],
}
```

数组里已有其他插件就追加一项，不要覆盖原来的配置。

安装后运行 `opencode plugin list` 确认，应该能看到 `model-prices`。仓库里已经带了构建好的 `dist/gui-experimental.cjs`，Git 安装不需要本地构建。

## 本地开发

要改源码，把仓库克隆到 OpenCode 配置目录，然后在 `plugins` 里写本地路径：

```bash
git clone https://github.com/jqming123/opencode-model-prices.git ~/.config/opencode/opencode-model-prices
```

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["./opencode-model-prices"],
}
```

插件 id 来自 `package.json`，固定为 `model-prices`，与仓库名、克隆目录名无关。

改完 `src/gui.tsx` 后重新构建：

```bash
cd ~/.config/opencode/opencode-model-prices
npm install
npm run bundle
```

开发时可以用 `npm run watch` 持续构建。

`dist/gui-experimental.cjs` 已纳入版本控制，克隆后无需先构建即可被 OpenCode 直接加载。修改源码后需要重新构建，并把 `src/` 和 `dist/` 一起提交。

## 功能

- 会话侧边栏面板 **Model prices**：列出当前项目可用模型，显示上下文窗口、输入 / 输出 / 缓存读写单价（USD / 1M tokens），支持搜索、按输入价 / 输出价 / 名称排序，并可切换正序 / 倒序；点击行直接切换模型。
- 默认隐藏免费模型（所有计价档 input 均为 0），点工具栏的 **free** 可临时显示，并提示隐藏了多少个。
- 会话标题栏小徽章：显示当前模型的输入 / 输出单价（紧凑模式下更短）。
- 命令面板 / 斜杠命令 `/prices` 可打开面板。

## 入口

- 打开方式：会话侧栏 **+** 菜单 → **Model prices**；或 `Ctrl+P` → **Model prices**；或输入 `/prices`。
- 插件开关：Desktop **Settings > Extensions > Plugins**。

## 目录

```text
~/.config/opencode/opencode-model-prices/
├── server.js               # 最小服务端入口，让插件被 OpenCode 识别为 active
├── src/gui.tsx             # GUI 插件源码
├── vite.config.ts
├── dist/gui-experimental.cjs
└── package.json            # exports ./gui-experimental
```

## 构建

```bash
cd ~/.config/opencode/opencode-model-prices
npm install
npm run bundle
```

## Git 仓库

本目录是一个独立的 Git 仓库，默认分支为 `main`，`node_modules/` 已被忽略。远程 `origin` 指向 <https://github.com/jqming123/opencode-model-prices>。

修改后推送：

```bash
git add .
git commit -m "Update model prices panel"
git push
```

GUI 插件 API 目前标记为 experimental，桌面端升级后如果布局或接口有变化，可能需要跟着调整。
