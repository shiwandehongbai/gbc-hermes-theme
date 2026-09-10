# GBC Workbench · v0.1.0-preview.1

English · [中文](README.md)

> **Host compatibility notice · 2026-09-10:** A confirmed host shared SDK loading failure can prevent the theme from loading. The upstream fix remains unmerged, and the download ZIP is unchanged. Back up first and read the [known host issue](#known-host-issue-2026-09-10-snapshot) below.

An unofficial **GIRLS BAND CRY / Togenashi Togeari fan theme for Hermes Desktop**. This is a Preview, not a stable release. It has no official affiliation with the franchise, band, or Hermes project.

## Artwork preview

![Bundled wallpaper artwork preview, not a product screenshot](assets/wallpaper/togeari-upper.jpg)

This is the bundled derivative wallpaper, **not a product screenshot or evidence of an actual application session**. See [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md) and [RIGHTS.md](RIGHTS.md).

## Features

- Wide working area, light local glass surfaces, solid code and table backgrounds, and readable overlays and tooltips.
- Five automatic sidebar portraits ordered Momoka, Nina, Subaru, Tomo, Rupa, with hover names and accessible labels. They do not replace chat avatars.
- Consistent colors for the native primary button's idle voice, typed send, and working stop states. Actions, disabled behavior, focus, and icons remain managed by the host.
- Three modes: 演出 (full-stage) for deliberate display; 工作 (reading, default) balances artwork and reading; 安静 (focus) fades the entire wallpaper. Figures embedded in a composite wallpaper cannot be hidden separately.
- Local image import, scale and position controls; optional separate background and transparent figure mode. Additional images are not included. The settings UI currently uses Chinese.

## Installation and wallpaper selection

1. Get `gbc-workbench.zip` from this project's Release. Extract the entire `gbc-workbench` folder into **`desktop-plugins` under your Hermes user directory**. Avoid an extra nesting level and keep the plugin folder name unchanged. Before upgrading, back up the existing plugin and skin and record your current skin name.
2. Enable GBC Workbench in Hermes Desktop's plugin manager, then Reload.
3. Open **GBC 设置** in the status bar. Keep “单张合成壁纸（默认）” (single composite wallpaper, default), and manually select `assets/wallpaper/togeari-upper.jpg` inside the plugin folder using the “单张合成壁纸” file picker.
4. Wait for “已保存到本地” (saved locally), then Reload and verify that the wallpaper and settings persist. Read failure, save failure, or an unknown save result do not indicate success; let the pending operation finish, retry, and verify again.

**The program does not automatically read the bundled wallpaper.** Manual selection is required. The five sidebar portraits are automatically read through the host's local file API from fixed filenames under `desktop-plugins/gbc-workbench/assets/roster/`. Missing files or unavailable host APIs may leave portraits absent.

The ZIP contains exactly these 12 files (release notes and build tools are source-repository only):

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

## Companion skin

Copy `skins/togenashi-dream.yaml` into **`skins` under your Hermes user directory**, then run:

```sh
hermes config set display.skin togenashi-dream
```

Reopen the interface or Reload as required by the host. No API, key, or controller model changes are needed. Running the plugin requires neither Node nor Python; the host provides React and the JSX runtime.

## Uninstall and rollback

First use “重置全部并清除图片” (reset everything and clear images) in GBC settings and wait for successful reset. Disable the plugin and Reload, then move the `desktop-plugins/gbc-workbench` folder out. Disabling alone does not actively clear saved settings. The skin is independent: restore your recorded skin with `hermes config set display.skin <previous-skin-name>`, then move out `skins/togenashi-dream.yaml`. To roll back, disable the plugin, restore your backup, and Reload. If an older version cannot read saved data, reset first and manually import the wallpaper again.

## Compatibility and verification scope

Prior actual application acceptance used **Windows 10 + a local Hermes Desktop 0.21.1 build**. macOS / Linux have not been tested on actual machines. Changes to host DOM, plugin APIs, or storage behavior may break compatibility; future versions are not guaranteed.

Automated browser tests use local Chromium and a simplified SDK/hook fixture to execute the actual plugin code, covering the three button states, storage success/failure/timeouts, lifecycle, portraits, and multiple viewports. This is not the complete Hermes React renderer or actual application acceptance on every platform. Preview release tests separately verify the fixed allowlist, hashes, extraction, and image decoding. No new product screenshots are supplied.

### Known host issue (2026-09-10 snapshot)

- **Symptoms and cause:** After a local Windows 10 environment updated to Hermes upstream commit `67764dc0863349a384c16425e73ee8571f3a94b7`, Desktop package version `0.17.2` exhibited a production bundling error caused by a circular dependency in the shared SDK. GBC and another disk plugin both reported `Cannot convert undefined or null to object` during shared SDK loading/import checks, before plugin code executed. GBC files and images were neither lost nor modified; this incident was not a theme API adaptation issue. The overall Hermes Agent version and the Desktop package version use different numbering; `0.21.1` above is a historical acceptance record and does not establish the affected version range for this incident.
- **Safe next steps:** Back up the theme, skin, and settings first, check the host's plugin page and logs, and follow the upstream fix. Avoid repeatedly reinstalling the theme, deleting settings or artwork, editing minified JS, or substituting empty objects as a fallback. If a local fix is needed, consult the upstream source changes and tests, confirm that the host build in use includes the fix, then Reload and verify; no one-click patch is provided.
- **Verification and upstream status:** A general fix that defers reading the SDK namespace, followed by rebuilding the complete host renderer and Reloading, restored the unchanged GBC wallpaper, glass effects, five portraits, and settings on this machine. Re-downloading the theme was not the remedy. See [upstream issue #107304](https://github.com/NousResearch/hermes-agent/issues/107304), [fix PR #107303](https://github.com/NousResearch/hermes-agent/pull/107303), and [companion regression verification PR #107405](https://github.com/NousResearch/hermes-agent/pull/107405). As of this snapshot, both PRs are OPEN with `mergedAt=null` and remain unmerged; upgrading to the latest version is not guaranteed to resolve the issue. Recovery is verified only on this local machine, with no guarantee for all operating systems or future versions. Further updates or forced rebuilds before upstream merge may overwrite the local host fix.
- **Download unchanged:** This maintenance update covers only the repository's `main` READMEs and online Release notes. The `v0.1.0-preview.1` version, tag, and download attachments remain unchanged; the ZIP does not contain the host fix. READMEs inside the ZIP retain the original release content. Consult the repository's `main` README and online Release for the latest compatibility status.

## Local build and tests

Requires **Python 3.11+, Node.js (with `node --test` support), and local Chromium / Chrome / Edge**. No pip/npm installation or network access is required. Set `CHROMIUM_PATH` to a browser executable, or let tests detect common installation locations. Set `PYTHON` to a Python executable; otherwise tests try python3, python, then py.

```sh
python -B tools/package_theme.py
python -B tools/package_theme.py --check
node --test tools/test_glass_roster.mjs tools/test_surface_contract.mjs tools/test_plugin_delivery.mjs tools/test_release.mjs
git -c core.whitespace=cr-at-eol diff --check
```

Replace `python` with `python3` or `py` as appropriate. The output is `dist/gbc-workbench.zip`; dist and test caches are excluded from the source repository. The build reads only a fixed allowlist and does not collect other local artwork. Tests create fixtures, extracted files, and browser profiles in the system temporary directory.

## Privacy and rights

The plugin stores settings and manually imported image data through host storage and reads only fixed local portraits. It does not upload images, add telemetry, or make network requests. Data handling by Hermes itself and model providers is outside this theme's control. Inspect image data before sharing host configuration or backups.

The six images are derivatives of user-supplied official artwork. Original publication URLs were not recorded, and no official redistribution permission has been supplied. **Noncommercial use is not permission.** This project does not claim official authorization and does not apply MIT or CC to the images. Public source availability also does not grant broad rights such as MIT: this Preview has no separate open-source code license. See [RIGHTS.md](RIGHTS.md).
