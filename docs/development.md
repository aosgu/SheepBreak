# 开发与调试

## 环境

无需 Node、无需构建、无需安装依赖，纯静态文件。开发时只需要 Chrome（120+ 建议）与一个文本编辑器。视觉效果可用 Playwright + 系统 Chrome 独立预览，不装扩展也能看。

## 本地加载

```bash
git clone https://github.com/aosgu/SheepBreak.git
```

`chrome://extensions` → 开启开发者模式 → 加载已解压的扩展程序 → 选仓库根目录。加载后点工具栏图标 →「立即看一次」立即验收。

调试入口：

- **service worker**：扩展卡片上的「service worker」链接，打开 DevTools；可手动执行 `chrome.alarms.get('sheep-main')` 查看下次触发
- **popup**：右键工具栏图标 → 审查弹出内容
- **动画层**：在目标页面 DevTools → Elements 里找 `#sheep-break-root`，展开 Shadow Root；Console 里可直接查 `chrome.storage.local.get()`

## 改代码后要不要刷新

| 改动文件 | 需要的操作 |
|---|---|
| `content/sheep.js` | **什么都不用做**，下一次提醒（或「立即看一次」）自动生效 |
| `background.js`、`manifest.json`、`popup/*`、`icons/*` | 在 `chrome://extensions` 点该扩展卡片的**刷新** |
| 首次安装 / 删除后重装 | 才用「加载已解压的扩展程序」 |

原因：`content/sheep.js` 通过 `executeScript({ files: [...] })` 每次触发时才从扩展目录读取注入，没有缓存在 service worker 里；已解压扩展每次从磁盘取最新文件。后台脚本与 manifest 则会被 Chrome 缓存在运行中的扩展实例里，必须刷新实例。

改动恰好发生在一次动画播放中时，那一轮仍是旧画面，12 秒后自动消失，下一轮换新。

## 可调参数

全部集中在 `content/sheep.js`：

| 常量 / 样式 | 默认 | 作用 |
|---|---|---|
| `DURATION` | 12000 | 动画总时长（ms），到点移除 DOM |
| `FADE_AT` | 10000 | 开始淡出的时刻（ms） |
| `ENTER_MS` | 2200 | 进场移动时长（ms） |
| `FLOCK_SIZE` | 9 | 羊的数量；超过 8 只时按 8 方向循环取出生点 |
| `OUT` | 130 | 出生点在视口外的距离（px） |
| `WOOL_COLORS` | 9 色数组 | 羊毛配色，按索引循环取 |
| `FIELD` | `min(72vmin, 860px)` | 中心草地边长 |
| `PAD` | `FIELD * 0.13` | 羊群活动区内缩，避开羽化边；调小会让羊更靠边 |
| `generateMeadowTexture(768)` | 768 | 草地纹理分辨率；调大更清晰但生成更慢、data URL 更大 |
| `.meadow { opacity }` | 0.9 | 草地不透明度 |
| `delay = i * 110` | 110ms | 每只羊的错峰间隔 |

`background.js` 里 `DEFAULTS.intervalMin`（默认 30）与顺延、暂停时长（10 / 60 分钟）可按需调整；间隔下拉选项在 `popup/popup.html`。

## 独立预览（不装扩展）

`content/sheep.js` 是自包含的，任意 HTML 页面注入即可运行；不在扩展环境时顺延按钮只会收场，不会报错。

```python
from playwright.sync_api import sync_playwright
from pathlib import Path

script = Path('content/sheep.js').read_text()
with sync_playwright() as p:
    browser = p.chromium.launch(
        executable_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        headless=True,
    )
    page = browser.new_page(viewport={'width': 1440, 'height': 900})
    page.set_content('<h1>测试页面</h1><button onclick="this.textContent=\'点到了\'">按钮</button>')
    page.add_script_tag(content=script)
    page.wait_for_timeout(3800)
    page.screenshot(path='preview.png')
    browser.close()
```

验收要点：草地是否居中且四周露出页面、9 只羊是否都在实心草地区内、页面按钮是否仍可点击、12 秒后 `#sheep-break-root` 是否被移除、Console 无报错。

## 提交前检查清单

- [ ] `node --check background.js && node --check content/sheep.js && node --check popup/popup.js`
- [ ] `manifest.json` 是合法 JSON，`version` 已按需递增
- [ ] 在真实网页（非 `chrome://`）跑一次完整 12 秒，确认自动收场
- [ ] 点一次「稍后 10 分钟」，确认收场且 10 分钟后补播、主周期未被重置
- [ ] 改间隔 / 关开总开关 / 暂停恢复各测一次，确认「下次」时间合理
- [ ] 文档中的参数与默认行为与代码一致

## 打包与发布

Chrome Web Store 需要 zip 包，**只打包运行时文件**：

```bash
zip -r SheepBreak-v1.0.0.zip manifest.json background.js content popup icons
```

不要打进 `docs/`、`.git/`、`preview.png`。上架时注意：全站权限会触发商店的额外审核与权限用途说明，需如实填写「到点在当前页面显示起身提醒，不读取页面数据」。

## 版本记录

| 版本 | 内容 |
|---|---|
| v1.0.0 | 中心草地版：草地改为页面中心 `min(72vmin, 860px)` 微缩地块，恢复原项目手绘羽化纸边，不透明度 0.9；羊群目标点收进草地实心区；纹理改 WebP 以支持透明边缘 |
| v0.x（未发布） | 全屏半透明草地板，羊群横向跑过；后按实测将透明度调至 0.6，最终由中心草地方案取代 |
