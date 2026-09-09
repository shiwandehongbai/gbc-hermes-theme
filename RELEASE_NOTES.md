# v0.1.0-preview.1

## 中文发布说明

首个含图 Preview：非官方 GIRLS BAND CRY / Togenashi Togeari fan theme for Hermes Desktop，不是稳定版，也无官方关联。

- 包含现有主题插件、五张侧栏头像、一张合成壁纸、配套 togenashi-dream skin，以及中英安装和权利说明。
- 提供演出、工作（默认）、安静三模式；保留宿主空闲语音、发送、停止三态原生交互。
- ZIP 内顶层目录为 `gbc-workbench`。解压到 Hermes 用户 `desktop-plugins` 目录、启用并 Reload；必须在 GBC 设置手动选择随包壁纸，看到“已保存到本地”后再次 Reload 验证。壁纸不自动读取，头像从固定本地路径自动读取。
- skin 需另行复制到 Hermes 用户 `skins` 目录，执行 `hermes config set display.skin togenashi-dream`；无需更改 API、密钥或模型。
- 已有实机验收限 Windows 10 + Hermes Desktop 0.21.1 本地版本；macOS/Linux 未实机测试。自动化 Chromium fixture 不是完整宿主实机测试，宿主 API/DOM 变化存在兼容风险。
- 固定白名单打包，六图字节与哈希锁定；发布测试验证解压文件、内容一致及图片解码。无新增产品截图；README 配图仅为素材预览。
- 插件仅本地存储导入图片和设置，不上传或添加遥测。升级前备份；卸载和回滚步骤见 [中文首页](README.md)。

素材未提供官方再分发许可，非盈利不等于许可；不声称官方授权，不给图片套 MIT/CC。代码也尚无独立开源许可，公开源代码不等于广泛授权。见 [RIGHTS.md](RIGHTS.md) 与 [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md)。

## English release notes

First artwork-inclusive Preview: an unofficial GIRLS BAND CRY / Togenashi Togeari fan theme for Hermes Desktop. Not a stable release, with no official affiliation.

- Includes the existing theme plugin, five sidebar portraits, one composite wallpaper, the companion togenashi-dream skin, and bilingual installation and rights documentation.
- Provides full-stage, reading (default), and focus modes while preserving native idle voice, send, and stop interactions.
- The ZIP's top-level folder is `gbc-workbench`. Extract into the Hermes user `desktop-plugins` directory, enable and Reload. Manually select the bundled wallpaper in GBC settings, wait for “已保存到本地” (saved locally), then Reload to verify. Wallpaper is not read automatically; portraits are read automatically from fixed local paths.
- Copy the skin separately into the Hermes user `skins` directory and run `hermes config set display.skin togenashi-dream`. No API, key, or model changes are needed.
- Prior actual application acceptance is limited to Windows 10 + a local Hermes Desktop 0.21.1 build. macOS/Linux have not been tested on actual machines. Automated Chromium fixtures are not complete host acceptance; host API/DOM changes may break compatibility.
- Fixed allowlist packaging pins the six images' bytes and hashes. Release tests verify extracted files, content equality, and image decoding. No new product screenshots; README imagery is artwork preview only.
- The plugin stores imported images and settings locally without uploads or added telemetry. Back up before upgrading; see the [English README](README.en.md) for uninstall and rollback.

No official artwork redistribution permission has been supplied. Noncommercial use is not permission; no official authorization is claimed and images are not licensed under MIT/CC. Code also has no separate open-source license; public source does not imply broad permission. See [RIGHTS.md](RIGHTS.md) and [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md).
