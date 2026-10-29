# 封面 review 頁（`scripts/arcCover/review/`）

用嚟揀廣播劇 / 短篇碟面同 tile 候選圖嘅頁面。頁面係 claude.ai Artifact
（<https://claude.ai/artifact/4xzNxQTTy9XjCQg46TLKiT>），用 artifact `db` capability 存揀選。
生成嘅圖、`rounds.json`、`files.json` 全部放 repo 外面嘅 work 資料夾，唔入 git（`.gitignore` 有擋）。

| 檔案               | 用途                                                                                  |
| ------------------ | ------------------------------------------------------------------------------------- |
| `fetch_sources.py` | 由 R2 下載封面原圖 → `<work>/arcCover-src/<drama>/<slug\|drama>.(png\|jpg)`           |
| `build.py`         | 收集 `<work>/arcCover/**/round-N/manifest.json` → `<work>/review/site` + `files.json` |
| `index.html`       | 頁面模板（`build.py` 會 copy 去 `site/index.html`）                                   |
| `serve.py`         | 本機睇 `site/`（冇 db，儲存唔到）                                                     |
| `verify.cjs`       | Playwright 逐套劇 / 逐個封面撳一次：console error、爛圖、橫向 scroll                  |

## 新劇 / 新短篇封面 workflow

```bash
PY="/tmp/arcCover-venv/bin/python -s -E"   # venv 見 root README；generate.py import 隔籬模組，唔好用 -I
WORK=/tmp/903-player-covers                # Claude 跑嘅話用 session scratchpad（Artifact publish 只收 scratchpad / repo 入面嘅檔）

# 1. 原圖：整套劇 + 有碟面嘅短篇；新短篇（drama.json 未有 disc）用 --arc 「短篇名=slug」
$PY scripts/arcCover/review/fetch_sources.py <id> --work $WORK --arc "新短篇名=new-slug"

# 2. 出候選圖（每次一個 round；唔填 --arc = 整套劇封面）
$PY scripts/arcCover/generate.py --input $WORK/arcCover-src/<id>/new-slug.jpg \
    --drama <id> --arc new-slug --out $WORK/arcCover

# 3. 砌 review 頁
$PY scripts/arcCover/review/build.py --work $WORK

# 4.（可選）本機檢查
$PY scripts/arcCover/review/serve.py $WORK/review/site &
PLAYWRIGHT_PATH=<repo>/node_modules/playwright node scripts/arcCover/review/verify.cjs http://127.0.0.1:8765
```

5. **Publish**（Claude 用 Artifact tool）：`file_path = $WORK/review/site/index.html`、`files` = `$WORK/review/files.json` 嘅內容、
   `url = https://claude.ai/artifact/4xzNxQTTy9XjCQg46TLKiT`（同一條 link 更新；唔好開新 artifact，否則之前嘅揀選唔會跟過去）。
   開新 artifact 先要 load `artifact-capabilities` skill 開 `db` capability；更新舊 URL 唔使再傳 `capabilities`。
6. **讀揀選**：ArtifactData `list` collection `reviews`。doc id = `<drama>--<slug>--r<round>`（整套劇 slug = `_drama`），
   `disc` / `tile` 值：
    - 候選 id（例如 `disc-face-crop`）→ 用 `<work>/arcCover/<drama>/<slug>/round-N/` 入面 manifest 嗰個 variant 嘅 `file`
    - `keep` 或者冇 doc（未儲存）→ 沿用現有圖，唔使改
    - `own` → 用家會另外畀圖；`null` → 未決定
    - `comment` → 下一輪要點改（例如 `--title-box`）
7. **入 app**：揀咗嘅 webp copy 去 `src/dramas/<id>/`：整套劇 `disc.webp` / `tile.webp`；短篇 `<slug>-disc.webp` / `<slug>-tile.webp`
   （新短篇要喺 `drama.json` 個 arc 加 `"disc"` / `"tile"`）。
8. **PATCH bump**（`package.json` version）。

## 備註

- 新短篇 drama.json 未有 `disc` 都會出現喺頁面（名暫時用 slug），加咗 `disc` 之後就用返短篇名
- 碟面候選預覽會裁走右邊細碟，淨係留大碟；現用圖都用 generator 同一個預覽（`preview.py`）公平比較
- `manifest.duplicateOf` 有值嘅候選（bytes 同前一個一樣）唔會列出
- 重跑 `build.py` 會覆蓋 `rounds.json` / `files.json`，圖檔大小一樣就唔會再 copy
