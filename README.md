# 妖荼

一个本地运行的 GPT Image 出图工作台，适合给软件主题、桌面工具、设置页和启动页批量生成背景图。除了「纯生图」，还内置「漫剧工作台」，用于从剧本任务包批量出分镜图。

## 双击启动

双击 `start-generator.bat`。

第一次运行会自动创建 `.env`，并打开记事本让你填入 `OPENAI_API_KEY`。保存并关闭记事本后，脚本会启动本地服务并打开浏览器。

## 命令行启动

```powershell
npm start
```

然后打开 `http://localhost:8787/studio`。这是新的 React 界面（桌面版默认也是它），纯生图和漫剧工作台都在这里。

旧版 vanilla-JS 界面仍保留在 `http://localhost:8787/`，如需回退可直接访问。

## 尺寸说明

`gpt-image-2` 支持更多自定义尺寸，但需要满足这些约束：

- 宽高都必须是 16 的倍数。
- 单边不能超过 `3840`。
- 总像素不能超过 `8,294,400`。

所以 `3840x2400` 虽然是 16:10，但总像素是 `9,216,000`，会超过当前上限。严格 16:10 的近 4K 安全档建议用 `3584x2240`。

## 生成结果

生成的图片会保存到 `outputs/批次ID/`，每个批次会带一个 `metadata.json`，里面记录模型、尺寸、质量、格式和最终提示词。

## 用途和风格

页面里有两层预设：

- `用途`：控制构图和硬约束，例如软件背景、人物写真、角色设定、桌面、产品、场景、建筑、海报、壁纸等。
- `风格`：控制视觉语言，例如写实摄影、电影感、日系动画、3D 渲染、水彩、油画、赛博朋克、东方奇幻、极简、像素艺术等。

选择 `自由创作` 和 `不套风格` 时，工具基本只使用你手写的提示词，不额外套预设风格。

生成卡片支持：

- 查看该图使用的提示词和参数。
- 一键设为参考图。
- 按原提示词、参数和参考图重Roll。

参考图会复制保存到对应批次的 `outputs/批次ID/references/`，所以历史图片重Roll 时仍然能找到原参考图。

## 漫剧工作台

除了单张纯生图，妖荼还能承接来自 Scriptwriter / 牛马制作人 的「生图任务包」，做整集分镜的批量出图。大致流程：

1. **导入任务包**：在工作台点 `导入任务包`，导入上游导出的任务包 JSON（含人设、分镜、每镜提示词等）。
2. **管理人设库**：为每个角色生成/指定基准图，并把满意的角色参考图「锁定」为该角色的固定参考，后续分镜复用，保证同一角色跨镜一致。
3. **分镜出图**：按分镜逐镜生成候选图，从候选里挑一张「定稿」。可以对单镜重生成、补生成候选。
4. **批量出图 + 导出**：批量跑完全集后，按镜号导出本集成图。

对应的后端路由是 `/api/projects/*`（项目列表、导入等）和 `/api/project/*`（单项目的人设、分镜、生成、定稿、导出等）。任务包 JSON 的字段和接口细节见 [`docs/生图任务包-接口规范.md`](docs/生图任务包-接口规范.md)。

## 配置

可以直接在页面左侧的“API 接入”里保存和切换配置。保存后会写入本地 `api-profiles.json`，这个文件已加入 `.gitignore`。

“生图接口”有三个模式：

- `Images API`：标准 OpenAI 兼容接口，走 `/v1/images/generations`。
- `聊天兼容`：给部分中转使用，走 `/v1/chat/completions`，并尝试从聊天返回里提取图片数据或图片 URL。
- `Responses`：给使用 Responses API 风格接口的中转，走 `/responses`，从返回结构里提取图片数据。

如果中转支持标准图片接口，优先用 `Images API`。如果它像 Cherry Studio 兼容通道那样把 `gpt-image-2` 当聊天模型处理，就切到 `聊天兼容`；如果中转只暴露 Responses 风格接口，则用 `Responses`。

可用环境变量：

- `OPENAI_API_KEY`：必填，服务端调用 OpenAI API 使用。
- `PORT`：本地端口，默认 `8787`。
- `OPENAI_IMAGE_MODEL`：默认 `gpt-image-2`。
- `OPENAI_BASE_URL`：默认 `https://api.openai.com`。如果使用第三方中转，填中转地址；带不带 `/v1` 都可以。

示例：

```env
OPENAI_BASE_URL=https://your-relay.example.com/v1
```

## 桌面版

开发时启动桌面窗口：

```powershell
npm run desktop
```

打包单文件便携版：

```powershell
npm run build:exe
```

产物会生成到 `dist/YaoTu-<版本>-x64.exe`。桌面版会把配置和出图保存到 Electron 的用户数据目录，不会把项目根目录里的 `api-profiles.json`、`.env` 或 `outputs/` 打进 exe。

首次启动桌面版时会尝试迁移旧网页版数据：

- 迁移 `.env`、`api-profiles.json` 和 `outputs/`。
- 目标位置已有文件时不会覆盖。
- 迁移状态会记录到桌面版用户数据目录的 `desktop-migration-state.json`，后续启动不会重复扫描同一个旧目录。

如果把 exe 移到了别的地方，自动迁移找不到旧项目目录，可以启动前指定：

```powershell
$env:YAOTU_LEGACY_DATA_DIR="G:\AI项目\AI-generated images"
.\YaoTu-<版本>-x64.exe
```

如果只想要稳定的文件夹版程序，可以运行：

```powershell
npm run build:dir
```

然后启动 `dist/win-unpacked/妖荼.exe`。

## 发布和安装版更新

GitHub Releases 已配置到仓库 `Abisso-Beretta/yaotu-image-studio`。

### 标准发布（推荐）

```powershell
npm run release
```

`npm run release`（即 `scripts/release.mjs`）会自动完成：bump 版本号 → commit → 打 tag → push。tag 推到 GitHub 后，GitHub Actions（`.github/workflows/release.yml`）会自动构建 NSIS 安装版并发布到 Releases，无需本地翻墙或构建。

> 国内网络推送 tag 到 GitHub 通常需要挂代理，否则 push 会失败、CI 也不会触发。

### 本地一条龙发布（备选）

如果不想走 CI，想在本机直接构建并发布：

```powershell
npm version patch
$env:GH_TOKEN="你的 GitHub token"
npm run release:github
```

`npm run release:github` 会在本地构建 NSIS + 便携版并直接上传到 Releases，需要 `GH_TOKEN`（有创建 Release 和上传附件权限）以及能访问 GitHub 的网络。

### 本地打安装包（不走自动更新）

```powershell
npm run pack
```

`npm run pack`（即 `scripts/pack.mjs`）在本地打出 NSIS 安装包，适合国内直接把安装包丢群里手动分发。这种方式不接自动更新。

单独打安装版产物也可以用：

```powershell
npm run build:installer
```

产物会生成到 `dist-installer/YaoTu-Setup-<版本>-x64.exe`，并额外生成自动更新需要的 `latest.yml` 和 blockmap 文件。安装版启动后会从 GitHub Releases 检查更新；便携版不会自动更新，仍然适合手动下载新版 exe 替换。

### 安装时的 SmartScreen 提示

安装版目前是**未做代码签名**的（`signAndEditExecutable: false`），这是内部工具的已知情况。小伙伴首次安装时，Windows 可能弹出蓝色的「Windows 已保护你的电脑」提示。此时点 **更多信息 → 仍要运行** 即可正常安装，不影响使用。
