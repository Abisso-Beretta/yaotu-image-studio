# 妖荼

一个本地运行的 GPT Image 出图工作台，适合给软件主题、桌面工具、设置页和启动页批量生成背景图。

## 双击启动

双击 `start-generator.bat`。

第一次运行会自动创建 `.env`，并打开记事本让你填入 `OPENAI_API_KEY`。保存并关闭记事本后，脚本会启动本地服务并打开浏览器。

## 命令行启动

```powershell
npm start
```

然后打开 `http://localhost:8787`。

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

## 配置

可以直接在页面左侧的“API 接入”里保存和切换配置。保存后会写入本地 `api-profiles.json`，这个文件已加入 `.gitignore`。

“生图接口”有两个模式：

- `Images API`：标准 OpenAI 兼容接口，走 `/v1/images/generations`。
- `聊天兼容`：给部分中转使用，走 `/v1/chat/completions`，并尝试从聊天返回里提取图片数据或图片 URL。

如果中转支持标准图片接口，优先用 `Images API`。如果它像 Cherry Studio 兼容通道那样把 `gpt-image-2` 当聊天模型处理，就切到 `聊天兼容`。

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

产物会生成到 `dist/YaoTu-0.1.0-x64.exe`。桌面版会把配置和出图保存到 Electron 的用户数据目录，不会把项目根目录里的 `api-profiles.json`、`.env` 或 `outputs/` 打进 exe。

首次启动桌面版时会尝试迁移旧网页版数据：

- 迁移 `.env`、`api-profiles.json` 和 `outputs/`。
- 目标位置已有文件时不会覆盖。
- 迁移状态会记录到桌面版用户数据目录的 `desktop-migration-state.json`，后续启动不会重复扫描同一个旧目录。

如果把 exe 移到了别的地方，自动迁移找不到旧项目目录，可以启动前指定：

```powershell
$env:YAOTU_LEGACY_DATA_DIR="G:\AI项目\AI-generated images"
.\YaoTu-0.1.0-x64.exe
```

如果只想要稳定的文件夹版程序，可以运行：

```powershell
npm run build:dir
```

然后启动 `dist/win-unpacked/妖荼.exe`。

## GitHub 发布和安装版更新

安装版打包：

```powershell
npm run build:installer
```

产物会生成到 `dist-installer/YaoTu-Setup-版本-x64.exe`。安装版会额外生成自动更新需要的 `latest.yml` 和 blockmap 文件。

GitHub Releases 已配置到仓库 `Abisso-Beretta/yaotu-image-studio`。

发布新版本时：

```powershell
npm version patch
$env:GH_TOKEN="你的 GitHub token"
npm run release:github
```

`GH_TOKEN` 需要有创建 Release 和上传附件的权限。安装版启动后会从 GitHub Releases 检查更新；便携版不会自动更新，仍然适合手动下载新版 exe 替换。
