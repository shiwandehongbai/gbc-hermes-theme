# GBC Workbench · v0.1.0-preview.3

[English](README.en.md) · 中文

> **preview.3：** 修复侧栏会话时间与三点菜单重叠，恢复宿主显示状态；保留 preview.2 修复。

> **preview.2：** 修复 GBC 启用时设置浮层的 8% peek 淡出；不包含宿主 SDK 修复。旧 SDK 公告及 issue/PR 状态仅为 [2026-09-10 已知快照](#已知宿主问题2026-09-10-快照)，本次未重新联网核验。

非官方 **GIRLS BAND CRY / Togenashi Togeari fan theme for Hermes Desktop**。这是 Preview 预览版，不是稳定版，与作品官方、乐队及 Hermes 项目无官方关联。

## Artwork preview（素材预览）

![随包壁纸素材预览，不是产品截图](assets/wallpaper/togeari-upper.jpg)

上图是随包衍生壁纸素材，**不是产品截图或实机效果证明**。素材权利说明见 [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md) 和 [RIGHTS.md](RIGHTS.md)。

## 特性

- 宽幅工作区域、局部轻透毛玻璃、实心代码与表格、清晰的浮层和提示文字。
- 侧栏五人头像自动读取，顺序为桃香、仁菜、昴、智、RUPA；姓名通过悬停与无障碍标签提供，不替换聊天头像。
- 原生主按钮的空闲语音、输入后发送、工作中停止三态使用一致配色；操作、禁用、焦点和图标仍由宿主管理。
- 三模式：演出（full-stage）用于主动展示；工作（reading，默认）兼顾壁纸与阅读；安静（focus）淡化整张壁纸。合成壁纸中的人物无法单独隐藏。
- 本地图片导入、构图缩放和位置调整；可选独立背景与透明人物模式，额外图片不随包提供。设置界面目前为中文。

## preview.3 修复与安全升级

侧栏通用按钮着色覆盖了宿主 SessionRow 菜单按钮的 `text-transparent`，使绝对定位在时间位置的三点菜单在空闲时也可见，造成重叠。preview.3 仅让这条着色规则避开 `[data-row-actions]` 内的按钮，恢复宿主的空闲、悬停、键盘焦点与菜单打开状态，以及悬停时尾部时间让位；不改变宽度、字体、标题空间或时间内容。preview.2 的设置浮层 peek 修复继续保留。

从 preview.2 安全升级：备份现有插件后，仅替换 preview.3 的 `plugin.js`；素材、skin 和设置不动，无需重新导入壁纸。执行插件 Reload/重新扫描，检查三模式下紧凑会话行和卡片标题的空闲时间、悬停菜单、键盘焦点和菜单打开状态，并确认标题不位移、壁纸及设置仍在。旧版本的 tag、附件和发布记录不重写。

Windows 实机已确认 preview.3 自动热重载生效：当前工作（reading）模式下，空闲时间清晰且不再与三点菜单重叠；点击会话三点按钮可打开原生操作菜单，点击空白关闭后时间恢复，五头像、壁纸与侧栏保留。验证期间未重启应用或 Gateway，也未切换用户活动会话。三模式、compact/card、鼠标悬停、Tab 焦点、模拟菜单 open 标记、停用恢复及六尺寸仍仅由执行真实插件代码的本地无头 Chromium fixture 覆盖；fixture 不是完整 Hermes React/Radix 实机验证，不代表所有模式或键盘交互已在实机通过。macOS / Linux 未测试。历史 SDK 警告继续适用，上游状态本次未重新核验。

## preview.2 修复与安全升级

启用 GBC 时，宿主含透明度预览 scope 的设置浮层在拖动、按住、松开滑块及键盘短暂预览（pulse）期间保持不透明，不再降为 8% 或执行淡出过渡。演出、工作、安静三模式均生效；其他不含该 scope 的浮层不受影响。禁用或卸载插件后恢复宿主原有 peek 行为。

“窗口透明”仍可调整，仍会作用于整个窗口，包括文字；透明度过高仍会让整体变淡。“气泡透明”调整的是气泡背景，与窗口透明不同。插件不改滑块数值、宿主预览标记或原生窗口透明度。

从 preview.1 升级：先备份已有插件，再用 preview.2 的 `plugin.js` 替换旧文件。素材和 skin 未变，无需重置设置或重新导入壁纸。通过插件热重载/重新扫描后，验证三模式下滑块拖动和键盘调整时设置可读、数值可变、壁纸仍在。本版本仍提供完整新 ZIP；不重写旧 `v0.1.0-preview.1` 附件。首次安装按下方步骤操作。

三模式交互由执行真实插件代码的 Chromium fixture 回归覆盖；浏览器 fixture 不能替代用户安装环境的热重载与实机确认。平台验证范围详见对应 Release 发布页；macOS / Linux 未实机验证。

## 安装与壁纸选择

1. 从本项目 Release 获取 `gbc-workbench.zip`，解压后将整个 `gbc-workbench` 文件夹放入 **Hermes 用户目录下的 `desktop-plugins`**。不要多套一层文件夹，也不要改插件目录名。升级前备份已有插件和 skin，并记下当前 skin 名称。
2. 在 Hermes Desktop 插件管理中启用 GBC Workbench，然后执行 Reload。
3. 打开状态栏 **GBC 设置**，保留“单张合成壁纸（默认）”，在“单张合成壁纸”文件选择器中手动选择插件文件夹内的 `assets/wallpaper/togeari-upper.jpg`。
4. 等到状态显示“已保存到本地”，再 Reload，确认壁纸及设置仍在。若出现读取失败、保存失败或保存结果未知，不要视作保存成功；待操作结束后重试并再次验证。

**程序不会自动读取随包壁纸。** 必须完成上述手动选择。五张侧栏头像则通过宿主本地文件 API 自动从 `desktop-plugins/gbc-workbench/assets/roster/` 的固定文件名读取；缺失文件或宿主 API 不可用时可能没有头像。

ZIP 中精确包含以下 12 个文件（发布说明和构建工具仅在源码仓库中）：

```text
gbc-workbench/
  plugin.js
  README.md
  README.en.md
  THIRD-PARTY-NOTICES.md
  RIGHTS.md
  assets/roster/roster-playful-v1-momoka.webp
  assets/roster/roster-playful-v1-nina.webp
  assets/roster/roster-playful-v1-subaru.webp
  assets/roster/roster-playful-v1-tomo.webp
  assets/roster/roster-playful-v1-rupa.webp
  assets/wallpaper/togeari-upper.jpg
  skins/togenashi-dream.yaml
```

## 配套 skin

将 `skins/togenashi-dream.yaml` 复制到 **Hermes 用户目录下的 `skins`**，然后执行：

```sh
hermes config set display.skin togenashi-dream
```

按宿主需要重新打开界面或 Reload。无需更改 API、密钥或主控模型。仅运行插件无需 Node 或 Python；React 和 JSX runtime 由宿主提供。

## 卸载与回滚

先在 GBC 设置中使用“重置全部并清除图片”，等待重置成功；再停用插件并 Reload。随后可移走 `desktop-plugins/gbc-workbench` 文件夹。仅停用不会主动清除已保存设置。skin 独立于插件：用 `hermes config set display.skin <previous-skin-name>` 恢复事先记录的 skin，再移走 `skins/togenashi-dream.yaml`。回滚版本时先停用，再恢复备份并 Reload；如旧版不兼容保存数据，先重置并重新手动导入图片。

## 兼容与验证范围

已有实机验收环境为 **Windows 10 + Hermes Desktop 0.21.1 本地版本**。macOS / Linux 未实机测试。宿主 DOM、插件 API 或存储行为变化可能导致兼容问题；本版本不保证未来版本兼容。

自动化浏览器测试使用本地 Chromium 和简化 SDK/hook fixture，执行真实插件代码，覆盖三态按钮、存储成功/失败/超时、生命周期、头像与多视口；它不是完整 Hermes React 渲染器，也不等于各平台实机验收。本 Preview 的发布包测试另行验证固定白名单、哈希、解压和图片解码。没有提供新产品截图。

### 已知宿主问题（2026-09-10 快照）

- **症状与原因：** 本地 Windows 10 环境更新至 Hermes 上游 commit `67764dc0863349a384c16425e73ee8571f3a94b7` 后，Desktop package version `0.17.2` 出现公共 SDK 循环依赖导致的生产打包错误。GBC 与另一个磁盘插件同时报 `Cannot convert undefined or null to object`，发生在公共 SDK 加载/导入检查阶段，插件代码尚未执行。GBC 文件和图片未丢失、未修改，本次不是主题 API 适配问题。Hermes Agent 整体版本与 Desktop package 版本不是同一编号；上文 `0.21.1` 是历史验收记录，不能用于推断本次受影响版本范围。
- **安全建议：** 先备份主题、skin 和设置，核对宿主插件页与日志，并关注上游修复。不要反复重装主题、删除设置或素材、手改压缩 JS，或用空对象兜底。需要本地修复时，请参考上游源码变更及测试，确认所用宿主构建已包含修复后再 Reload 验证；不提供一键补丁。
- **验证与上游状态：** 本机通过通用的 SDK namespace 延迟读取修复，重建完整宿主 renderer 并 Reload 后，原样 GBC 的壁纸、毛玻璃、五头像与设置恢复，并非重新下载主题解决。见 [上游 issue #107304](https://github.com/NousResearch/hermes-agent/issues/107304)、[修复 PR #107303](https://github.com/NousResearch/hermes-agent/pull/107303) 和 [回归验证配套 PR #107405](https://github.com/NousResearch/hermes-agent/pull/107405)。截至本快照，两个 PR 均为 OPEN、`mergedAt=null`，尚未合并，不能保证升级最新版即可解决。恢复仅有本机实证，不保证所有操作系统或未来版本兼容；上游合并前再次更新或强制重建可能覆盖本地宿主修复。
- **旧版 SDK 维护公告历史：** 当时仅更新仓库 `main` README 与在线 Release 说明，`v0.1.0-preview.1` 的版本、tag 和附件保持原样，旧 ZIP 内 README 仍为原发布内容。preview.2 是包含主题 peek 修复的新包；新旧包均不包含宿主 SDK 修复。

## 本地构建与测试

需要 **Python 3.11+、Node.js（支持 `node --test`）和本地 Chromium / Chrome / Edge**。不需要 pip/npm 安装，不需要联网。浏览器可通过 `CHROMIUM_PATH` 指定可执行文件路径；否则检测常见安装位置。`PYTHON` 可指定 Python 可执行文件，未指定时测试依次检测 python3、python、py。

```sh
python -B tools/package_theme.py
python -B tools/package_theme.py --check
node --test tools/test_glass_roster.mjs tools/test_surface_contract.mjs tools/test_plugin_delivery.mjs tools/test_release.mjs
git -c core.whitespace=cr-at-eol diff --check
```

按本机命令名称将 `python` 替换为 `python3` 或 `py`。产物为 `dist/gbc-workbench.zip`；dist 和测试缓存不加入源码仓库。构建只读取固定白名单，不收集其他本机素材。测试在系统临时目录生成 fixture、解压内容和浏览器配置。

## 隐私与权利

插件通过宿主 storage 保存设置和手动导入的图片数据，只读取固定本地头像；插件不上传图片、不添加遥测、不发起网络请求。Hermes 自身和模型提供商的数据处理不由本主题控制。分享宿主配置或备份前请自行检查其中的图片数据。

六张图是用户提供的官图衍生文件，原发布链接未记录，未提供官方再分发许可。**非盈利不等于获得许可**；本项目不声称获得官方授权，不给图片套用 MIT 或 CC。公开源代码也不等于授予 MIT 等广泛授权：本 Preview 尚无独立代码开源许可，详见 [RIGHTS.md](RIGHTS.md)。
