# 封面 review 頁（`scripts/arcCover/review/`）

用嚟揀廣播劇 / 短篇碟面同 tile 候選圖嘅頁面。頁面係 claude.ai Artifact
（<https://claude.ai/artifact/4xzNxQTTy9XjCQg46TLKiT>），用 artifact `db` capability 存揀選。
生成嘅圖、`rounds.json`、`files.json`、`publish-N.json` 全部放 repo 外面嘅 work 資料夾，唔入 git（`.gitignore` 有擋）。
work 資料夾：`--work <dir>`；唔填就用環境變數 `ARC_COVER_WORK`，再冇就 `$TMPDIR/903-player-covers`。

| 檔案               | 用途                                                                                                     |
| ------------------ | -------------------------------------------------------------------------------------------------------- |
| `fetch_sources.py` | 由 R2 下載封面原圖 → `<work>/arcCover-src/<drama>/<slug\|drama>.(png\|jpg)`                              |
| `build.py`         | 收集 `<work>/arcCover/**/round-N/manifest.json` → `<work>/review/site` + `files.json` + `publish-N.json` |
| `publish.py`       | Artifact 上限分批 + 列出要刪（null）嘅舊 path（`build.py` 用）                                           |
| `index.html`       | 頁面模板（`build.py` 會 copy 去 `site/index.html`）                                                      |
| `serve.py`         | 本機睇 `site/`（冇 db，儲存唔到）                                                                        |
| `verify.cjs`       | Playwright 逐套劇 / 逐個封面撳一次：console error、爛圖、橫向 scroll                                     |

## 新劇 / 新短篇封面 workflow

```bash
PY="/tmp/arcCover-venv/bin/python -s -E"      # venv 見 root README；generate.py import 隔籬模組，唔好用 -I
export ARC_COVER_WORK=/tmp/903-player-covers  # Claude 跑嘅話用 session scratchpad（Artifact publish 只收 scratchpad / repo 入面嘅檔）
WORK=$ARC_COVER_WORK

# 1. 原圖：整套劇 + 有碟面嘅短篇；新短篇（drama.json 未有 disc）用 --arc 「短篇名=slug」
#    exit 1 = R2 真係冇；exit 3 = 網絡 / TLS / proxy 出錯（會印 curl stderr，唔好當冇封面）
$PY scripts/arcCover/review/fetch_sources.py <id> --arc "新短篇名=new-slug"

# 2. 出候選圖（每次一個 round；唔填 --arc = 整套劇封面）
$PY scripts/arcCover/generate.py --input $WORK/arcCover-src/<id>/new-slug.jpg \
    --drama <id> --arc new-slug --out $WORK/arcCover

# 3. 砌 review 頁（印出今次要 publish 嘅 publish-N.json）
$PY scripts/arcCover/review/build.py

# 4.（可選）本機檢查
$PY scripts/arcCover/review/serve.py $WORK/review/site &
PLAYWRIGHT_PATH=<repo>/node_modules/playwright node scripts/arcCover/review/verify.cjs http://127.0.0.1:8765
```

5. **Publish**（Claude 用 Artifact tool）：逐份 `$WORK/review/publish-N.json` publish 一次，每次都係
   `file_path = $WORK/review/site/index.html`、`files` = 嗰份 json 嘅內容、
   `url = https://claude.ai/artifact/4xzNxQTTy9XjCQg46TLKiT`（同一條 link 更新；唔好開新 artifact，否則之前嘅揀選唔會跟過去）。
   每次都全部重送（唔做增量）；刪咗 round 嘅話 build 時加 `--previous <上次 publish 用嘅 files.json>`，
   最後一批會對冇咗嘅舊 path 傳 `null` 刪走。
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

## Artifact publish 上限

- 每次 publish 最多 **255 個檔 / 64MB**；每個版本最多 **511 個檔 / 256MB**
- 更新時冇傳嘅檔會**保留**（舊 round 嘅圖會一直留喺 artifact）
- `build.py` 每次將**全部**檔寫入 `publish-N.json`（每份 ≤ 255 個、≤ 64MB；`rounds.json` 擺最後，等佢引用嘅圖先上咗）。
  而家全部大約 90 個檔，一份就夠；唔做增量（之前試過記 hash，但記錯會令頁面靜靜冇咗新 `rounds.json`）
- 舊 path 唔會自己消失：`--previous <上次 files.json>` 列出上次有、今次冇嘅 path，喺最後一批傳 `null` 刪走
  （唔記得上次嘅 `files.json` 就算，淨係佔位，唔影響頁面）
- 總數超過 511 個時 `build.py` 會警告
- `index.html` 係主頁，每次 publish 都會送

## 備註

- 新短篇 drama.json 未有 `disc` 都會出現喺頁面（名暫時用 slug），加咗 `disc` 之後就用返短篇名
- 碟面候選預覽會裁走右邊細碟，淨係留大碟；現用圖都用 generator 同一個預覽（`preview.py`）公平比較
- `manifest.duplicateOf` 有值嘅候選（bytes 同前一個一樣）唔會列出
- 重跑 `build.py` 會覆蓋 `rounds.json` / `files.json`；圖檔內容（sha256）一樣就唔會再 copy
- slug / 劇集 id 只可以細楷英文、數字同單一個 `-`（冇 `/`、`..`、`--`），slug 唔可以係 `cover` / `drama`
  （頁面 hash `<drama>-cover` 代表整套劇、原圖 `drama.png` 代表整套劇）；唔啱 `build.py` / `fetch_sources.py` 會停
- 兩套劇 + 短篇砌出同一個頁面 hash（例如 `sammy-kitty` + `love` 同 `sammy` + `kitty-love`）`build.py` 亦會停
