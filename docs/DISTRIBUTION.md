# InkNest 墨栖 — 分发与测试说明

## 这次打的包
- 文件:`dist/InkNest-1.0.0-arm64.dmg`(约 198 MB)
- 平台:**仅 Apple Silicon(M 系列)macOS**(arm64)。Intel Mac 不可用。
- 签名:Developer ID 签名(Orris Technology Pty Ltd),**未做 Apple 公证(notarize)**。
  → 因此首次打开需要「右键 → 打开」一次,之后正常双击。
- 同时生成了 `dist/InkNest-1.0.0-arm64-mac.zip`(同一个 app,用于自动更新 / 直接解压)。

## 发给测试者的安装步骤
1. 把 `InkNest-1.0.0-arm64.dmg` 发给对方(AirDrop / 网盘 / 微信传文件均可)。
2. 双击 dmg,把 **InkNest** 拖进「应用程序」。
3. **第一次打开**:在「应用程序」里找到 InkNest,**右键 →「打开」**,弹窗里再点「打开」。
   (因为没做 Apple 公证,直接双击会提示「无法验证开发者」;右键打开可绕过,只需一次。)
   - 如果对方系统较新提示「已损坏 / 无法打开」,让对方在「终端」执行一次:
     `xattr -dr com.apple.quarantine /Applications/InkNest.app`,然后再右键打开。

## 必须配置:API Key(否则无法对话)
InkNest 是 **自带 Key(BYO-key)** 的本地应用,不含任何服务器。测试者需要一个 API Key:
- 打开 App → 右下角 **齿轮(设置)** → 粘贴 **Anthropic API Key**(`sk-ant-...`)。
- Key 用系统 Keychain 加密存储在本机,不上传任何服务器。
- 默认模型 `claude-opus-4-8`,需要该 Key 有对应权限;也可在设置里切换到 DeepSeek / 智谱 / Moonshot 等兼容供应商并填它们的 Key。
- 如果你想让对方零配置体验,可以临时给一个你的测试 Key(用完即换)。

## 可以测什么(都已实现、本机验证可用)
- **创作对话**:流式回复、思考过程、Markdown;右上角可切模型。
- **联网**:输入框「联网」开关 → 实时网络检索(仅 Anthropic 供应商)。
- **素材库**:文本 / 图片 / 从链接抓取;按平台分组;「入上下文」的素材(含图片)会注入创作。
- **多平台改写**:一段内容一键改写成小红书 / 公众号 / 抖音 / 视频号 / X,多版并出,可存回素材库。
- **语音输入**:麦克风转写(在线;离线模型首次使用会下载约几十 MB)。
- **卡片导出**:把回复导出成图片 / PDF。
- **定时任务 / 每日回顾 / 会议纪要**、**工作区 → 项目 → 对话** 层级。
- **浏览器自动化**、**技能(创作风格/人设)**。

## 已知限制(可如实告诉测试者)
- **真·编程 agent(左栏「编程」)** 依赖本机的 Claude Code 引擎,打包环境下可能不可用;
  核心创作功能不受影响。测试重点放在创作 / 素材 / 改写上。
- 未公证 → 首次打开有一次「右键打开」的小摩擦(见上)。
- 仅 arm64;Windows / Intel / Linux 包未打(配置已就绪,需要时可加 target)。

## 重新打包(给将来的你)
```bash
# Developer ID 签名(身份用 hash 传入,避免把实体名写进仓库配置)
CSC_IDENTITY_AUTO_DISCOVERY=true \
CSC_NAME=A756755624F8D715723BA78D6C8F55BA55C97041 \
npm run build:mac
# 产物在 dist/
```
- 想要**双击零摩擦**:把 `electron-builder.yml` 的 `mac.notarize` 设为带凭据的公证配置,
  并提供 `APPLE_ID` + app 专用密码(或 App Store Connect API key)。
- 原生模块(better-sqlite3 / sherpa-onnx)已在 `asarUnpack` 中解包,打包后本机已验证可加载。
