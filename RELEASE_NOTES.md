# v0.1.0-preview.1

## 维护公告 / Maintenance notice · 2026-09-10

本次仅补充仓库 `main` 的中英 README 与本版本在线 Release 说明，以下原发布说明完整保留。`v0.1.0-preview.1` 的版本、tag、插件、素材、skin 和下载附件均不变；ZIP 未重新打包，不包含宿主修复，包内 README 仍为原发布内容。最新兼容状态请查看仓库 `main` 的 [中文 README](README.md#已知宿主问题2026-09-10-快照) 与在线 Release。

本地 Windows 10 更新至 Hermes 上游 commit `67764dc0863349a384c16425e73ee8571f3a94b7` 后，Desktop package version `0.17.2` 出现公共 SDK 循环依赖的生产打包错误。GBC 与另一个磁盘插件在公共 SDK 加载/导入检查阶段报 `Cannot convert undefined or null to object`，插件代码尚未执行，主题文件和图片未丢失、未修改；本次不是主题 API 适配问题。Hermes Agent 整体版本与 Desktop package 版本编号不同，下方历史记录 `0.21.1` 不能用于推断本次受影响版本范围。

本机通过通用的 SDK namespace 延迟读取修复，重建完整宿主 renderer 并 Reload 后，原样 GBC 壁纸、毛玻璃、五头像与设置恢复，非重新下载主题解决。先备份主题、skin 与设置，核对宿主插件页和日志，避免反复重装、删除设置或素材、手改压缩 JS 或空对象兜底。需要本地修复时参考上游源码变更及测试，确认所用宿主构建已包含修复后再 Reload 验证，不提供一键补丁。

上游追踪：[issue #107304](https://github.com/NousResearch/hermes-agent/issues/107304)、[修复 PR #107303](https://github.com/NousResearch/hermes-agent/pull/107303)、[回归验证配套 PR #107405](https://github.com/NousResearch/hermes-agent/pull/107405)。截至本快照，两个 PR 均为 OPEN、`mergedAt=null`，尚未合并，不能承诺升级最新版已解决。恢复仅有本机实证，不保证所有操作系统或未来版本兼容；上游合并前再次更新或强制重建可能覆盖本地宿主修复。

This maintenance update adds bilingual compatibility information only to the repository's `main` READMEs and this version's online Release notes, preserving the original release notes below in full. The `v0.1.0-preview.1` version, tag, plugin, artwork, skin, and download attachments remain unchanged. The ZIP has not been repackaged and does not contain the host fix; its READMEs retain the original release content. For the latest compatibility status, consult the [English README on `main`](README.en.md#known-host-issue-2026-09-10-snapshot) and online Release.

After a local Windows 10 environment updated to Hermes upstream commit `67764dc0863349a384c16425e73ee8571f3a94b7`, Desktop package version `0.17.2` exhibited a production bundling error caused by a circular dependency in the shared SDK. GBC and another disk plugin reported `Cannot convert undefined or null to object` during shared SDK loading/import checks, before plugin code executed. Theme files and images were neither lost nor modified; this was not a theme API adaptation issue. Overall Hermes Agent and Desktop package versions use different numbering; the historical `0.21.1` record below does not establish this incident's affected version range.

A general fix that defers reading the SDK namespace, followed by rebuilding the complete host renderer and Reloading, restored the unchanged GBC wallpaper, glass effects, five portraits, and settings locally. Re-downloading the theme was not the remedy. Back up the theme, skin, and settings first, and check the host's plugin page and logs. Avoid repeated reinstalls, deleting settings or artwork, editing minified JS, or empty-object fallbacks. For a local fix, consult the upstream source changes and tests, confirm that the host build in use includes the fix, then Reload and verify; no one-click patch is provided.

Upstream tracking: [issue #107304](https://github.com/NousResearch/hermes-agent/issues/107304), [fix PR #107303](https://github.com/NousResearch/hermes-agent/pull/107303), and [companion regression verification PR #107405](https://github.com/NousResearch/hermes-agent/pull/107405). As of this snapshot, both PRs are OPEN with `mergedAt=null` and remain unmerged; upgrading to the latest version is not guaranteed to resolve the issue. Recovery is verified only on this local machine, with no guarantee for all operating systems or future versions. Further updates or forced rebuilds before upstream merge may overwrite the local host fix.

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
