# Code Review — 2026-10-29 — 短篇碟面 / tile 候選圖 generator（`scripts/arcCover/`）

- 審閱者：Code Reviewer（獨立角色，冇寫過呢批代碼）
- 目標：`claude/keen-pascal-5iifg0`，`56f078f` merge 入嚟嘅兩個 commit：
    - `cb973cd` feat(tools)：`scripts/arcCover/`（`generate.py`、`analysis.py`、`compose.py`、`preview.py`、`constants.py`、`tests/test_generate.py`、`requirements.txt`、`ruff.toml`、`.gitignore`）
    - `b028f75` docs(readme)：README「短篇碟面 / tile 候選圖」小節
- 背景（用戶已批）：由短篇喺 R2 嘅封面相生成幾款碟面（600×600 webp）同 tile（短篇 1216×684、廣播劇本身 1216×608）候選圖，預覽要似 app（圓形 mask、碟心、ArcSheet 52px、40px 細碟、書架 2:1 crop），每個 round 一份 `manifest.json`；用戶喺 review 頁揀，所以 manifest 要穩定、deterministic。第一輪（蘭茜夫人劇場，47 個候選）已經出咗喺 scratchpad。
- Developer 自報弱點（唔當新問題重複扣分）：Haar 人面喺呢批封面唔準（heart face-crop 錯）、saliency 係自己寫嘅 spectral residual（冇 opencv-contrib）、標題字偵測粗糙、title-shrink inpaint 喺花底會搽花、星空 / bokeh 補底未做。
- Design Origin：冇改 `*.tsx` / `*.css`，Design Fidelity n/a；唔係 PWA 改動，PWA 檢查 n/a。
- Version：冇 bump。純開發工具，app build 唔變；跟 `2026-10-29_review_catalog-tools.md` 先例，唔當 Warning。
- TDD：成個工具同 test 喺同一個 commit（`cb973cd`），睇唔到 test 先 fail 嘅紀錄。**想問 developer：有冇先寫 test 見佢紅？** 唔扣分，但下次請喺 commit 分開或者寫明。
- Review Item ID：`grep -rhoE` 掃 `.proj-docs/` 證實最高 W-489、S-559、C-008。今次由 **W-490**、**S-560** 開始（用到 W-490–W-495、S-560–S-566）。
- 總評：hard gates 全部 pass，冇 🔴 Critical。**核心做得好**：尺寸同已 commit 嘅 webp 完全一樣；reviewer 用同一張 `half.png` + 同一個 `--title-box` 重新生成，**manifest 同第一輪逐 byte 一樣**（即係 12 個 webp 嘅 sha256 全部一樣）；slug 驗證擋咗 path traversal；test 唔使網絡、覆蓋率 93%。問題喺**預覽準確度**同**周邊**：暗角幾何同 CSS 唔一樣（W-490）、壞輸入出 traceback 兼留低半個 round（W-491）、照 README 跑 test 會令 `npm run lint` fail（W-492）、依賴下限容許有 CVE 嘅版本兼 determinism 只限同一個 env（W-493），加上函數長度（W-494）同 inline magic number（W-495）。
    - 按評分規則得 **63 分**（6 W + 7 S），< 75，所以 ❌ fail —— 唔係 gate 問題，係分數。修好 6 個 W 就 ≥ 90。

---

## Hard Gates

| Gate          | 結果    | 證據                                                                                                                                                                                                                                                                                                                                      |
| ------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lint          | ✅ pass | `ruff check scripts/arcCover`「All checks passed!」；`ruff format --check` 6 個檔已 format；`npx prettier --check README.md scripts/arcCover`「All matched files use Prettier code style!」。Prettier 唔識 `.py` / `.txt` / `.toml`，eslint 唔掃 Python，所以 commit 咗嘅檔唔會整爛 `npm run lint`（但見 W-492：跑 test 留低嘅 cache 會） |
| Type check    | n/a     | Python 冇 mypy / pyright 設定（`ruff.toml` 只有 lint）；冇改任何 TS，`tsc -b` 唔受影響                                                                                                                                                                                                                                                    |
| Tests         | ✅ pass | `venv-arcCover/bin/python -m pytest scripts/arcCover/tests -q`：9 passed（26.8s），唔使網絡（假封面用 numpy / cv2 砌）                                                                                                                                                                                                                    |
| Coverage      | ✅ pass | `coverage run --include='scripts/arcCover/*' -m pytest …`（reviewer 喺 scratch venv 裝 coverage，冇改 repo）：`analysis.py` 85%、`compose.py` 98%、`generate.py` 83%、`preview.py` 99%、總數 93%。冇行到：人面 + 眼過濾（`analysis.py:136–142`、`159–163`）、CLI `main` / `_parse_args`（見 S-563）                                       |
| No Critical   | ✅ pass | 0 個 🔴                                                                                                                                                                                                                                                                                                                                   |
| Security scan | ✅ pass | 實際裝到嘅版本（opencv-python-headless 4.14.0.94、numpy 2.5.4、pillow 13.0.0、pytest 9.2.0）冇已知 Critical / High；license：OpenCV Apache-2.0、numpy BSD-3、Pillow MIT-CMU、pytest MIT，冇 GPL。但 `requirements.txt` 嘅下限容許有 CVE 嘅舊版，見 W-493                                                                                  |

## 評分結果

| 維度     | 得分   | 滿分    | 備注                                                                                                  |
| -------- | ------ | ------- | ----------------------------------------------------------------------------------------------------- |
| 正確性   | 13     | 25      | W-490（暗角幾何）、W-491（壞輸入 / 半個 round）、S-562（`--force` 舊檔）、S-564（細碟預覽冇外圈）     |
| 安全性   | 15     | 20      | W-493（依賴下限容許 libwebp CVE-2023-4863 等舊版）                                                    |
| 可維護性 | 2      | 20      | W-492（cache 整爛 `npm run lint`）、W-494（函數 > 30 行）、W-495（magic number）、S-560、S-561、S-566 |
| 測試覆蓋 | 14     | 15      | S-563（人面路徑 / CLI 冇 test、face-crop 放大冇提示）                                                 |
| 性能     | 10     | 10      | 第一輪 4 張圖每張幾秒，可接受                                                                         |
| 代碼風格 | 9      | 10      | S-565（ruff 唔喺 requirements / README）                                                              |
| **總分** | **63** | **100** |                                                                                                       |

**結果：❌ fail**（hard gates 全 pass、冇 Critical，但 63 < 75）

| Commit                | 內容                                   | 分數 | Status            |
| --------------------- | -------------------------------------- | ---- | ----------------- |
| `cb973cd`             | generator + test + requirements / ruff | 63   | ❌ fail           |
| `b028f75` / `56f078f` | README 小節 / merge                    | —    | 併入上面（S-561） |

---

## 重點驗證

| 項目                          | 結論         | 證據                                                                                                                                                                                                                                                                                                                       |
| ----------------------------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 尺寸 vs 已 commit 嘅 webp     | ✅ 一致      | `src/dramas/*/` 40 個 webp：碟面全部 600×600、短篇 tile 全部 1216×684、`tile.webp`（劇本身）全部 1216×608，同 `DISC_SIZE` / `ARC_TILE_SIZE` / `DRAMA_TILE_SIZE` 一樣；test 有開返 webp 驗 size 同 format                                                                                                                   |
| 碟面疊層 vs `Disc.module.css` | ⚠️ 大致啱    | 碟心 12%（細碟 20%）、坑紋 inset 10 / 22 / 34%、1px groove、碟心外 3px ring（`box-shadow` 向外）、大碟 10px 碟邊用 `--color-disc-rim` = theme `surface`、細碟冇暗角 / 坑紋（`Disc.tsx` 只喺 `large` 畫）全部啱。**暗角唔啱**（W-490）；細碟漏咗 `.small` 嘅 3px divider 外圈（S-564）                                      |
| ArcSheet 52px 環              | ✅           | `--arc-sheet-ring` 52px、padding `--space-1` 4px、conic 由 12 點順時針（PIL `pieslice` -90° 起）、`--color-accent-fill` = theme `accent`、track = theme `track`、圓形 cover 冇碟心（同 CSS 註解「唔挖碟心孔」一致）                                                                                                        |
| 書架 2:1 crop 框              | ✅           | `DramaShelf.module.css` `.tile` `aspect-ratio: 2 / 1` + `.art` `object-fit: cover`，CSS 註解「原圖 16:9，cover 裁走少少上下」，預覽框置中畫 2:1，啱                                                                                                                                                                        |
| Theme 來源                    | ✅           | 6 個 `drama.json` 嘅 `bg` / `surface` / `track` / `accent` 全部 6 位 hex，`_hex_rgb` 讀得到；搵唔到 drama.json 用蘭茜預設                                                                                                                                                                                                  |
| Determinism（同一個 env）     | ✅ byte 一樣 | reviewer 用 `half.png` + `--title-box 582,36,37,169` 重新生成落另一個 out，`manifest.json` 同第一輪 `cmp` 一樣（12 個 sha256 全部一樣）；test 亦有兩次 run 比 manifest bytes。`fit-extend` seed 用 `crc32`（唔受 `PYTHONHASHSEED` 影響）；webp `quality=88, method=6` 固定；預覽由**解碼返嘅 webp** 砌（睇到壓縮效果，好） |
| Determinism（跨 env）         | ⚠️           | 冇鎖版本、manifest 冇記 library version，換 Pillow（libwebp）/ OpenCV / numpy 版本 sha256 會變，`duplicateOf` 亦可能變（W-493）                                                                                                                                                                                            |
| Round 編號 / `--force`        | ⚠️           | 自動 = 現有 `round-*` 最大 + 1；已有 `manifest.json` 冇 `--force` 就拒（test 有）。但：(1) 壞輸入 crash 之後留低冇 manifest 嘅 round 資料夾，下次自動號會跳（W-491）；(2) `--round -1` 開到 `round--1`、`--round 0` 開到 `round-0`（W-491）；(3) `--force` 唔清舊檔（S-562）；(4) 「已存在」喺做完成個分析先報（S-566）    |
| Manifest schema               | ✅ 欄位齊    | review 頁要用嘅 `drama`、`arc`（劇本身係 `null`）、`level`、`round`、`source{file,width,height}`、`variants[{id,kind,method,file,preview,width,height,duplicateOf}]` 全部有；variant 次序由 `DISC_METHODS` / `TILE_METHODS` tuple 定，穩定；有 `schema: 1`。但 `duplicateOf` 有時有、有時冇（S-560）                       |
| Slug / path 安全              | ✅           | `--drama` / `--arc` 用 `^[a-z0-9][a-z0-9-]*$` 驗，喺讀 `src/dramas/<drama>/drama.json` 同開輸出資料夾之前，`../` 入唔到                                                                                                                                                                                                    |
| 會唔會整爛 npm build / lint   | ⚠️           | commit 咗嘅檔冇問題（見 Hard Gates）；`scripts/arcCover/.gitignore` 冚到 `__pycache__` / `.pytest_cache` / `*.pyc`。但照 README 喺 repo 根跑 pytest，cache 落 **repo 根** `.pytest_cache/`，入面 `README.md` 令 `prettier --check .` fail（W-492，reviewer 實測）                                                          |
| 第一輪輸出                    | ✅           | 4 份 manifest（`_drama` 11、`first-love` / `half` / `heart` 各 12）= 47 個候選，同 developer 報告一致；`duplicateOf` 有標出（例如 half 嘅 tile 原圖已經 16:9，5 個 tile 方法有 4 個同 center-crop 一樣）                                                                                                                   |

---

## 問題清單

### 🔴 Critical

冇。

### 🟡 Warning

#### W-490 — 暗角（vignette）幾何同 CSS 唔一樣：預覽暗咗成倍，saliency-crop 嘅碟面權重亦跟住錯

- 位置：`scripts/arcCover/preview.py:61–69`（`_vignette`）、`scripts/arcCover/compose.py:73–81`（`disc_visibility`）、`scripts/arcCover/constants.py:47–48`
- 描述：`Disc.module.css` 寫 `radial-gradient(circle, transparent 55%, var(--color-disc-vignette) 100%)`。`circle` 冇寫大小，CSS 預設係 **`farthest-corner`**：100% = 中心去角嘅距離 = 碟半徑 × √2。所以 app 入面暗角由 0.55 × √2 ≈ **0.78 個半徑**先開始，到碟邊只係 (1/√2 − 0.55) / 0.45 × 45% ≈ **16% 黑**。generator 將 100% 當成碟邊：由 **0.55 個半徑**開始，碟邊 **45% 黑** —— 開始得早、碟邊深成 3 倍。`disc_visibility` 用同一條公式，所以 saliency-crop / text-safe-crop（碟面）會過份避開碟邊，主體被推向中間（再俾碟心擋）。
- 影響：用戶睇預覽揀碟面，邊位睇落比 app 暗好多，會錯判「主體喺邊位睇唔到」；crop 揀位亦偏。呢個工具最核心嘅承諾就係「預覽似 app」。
- 方案 A：`constants.py` 加 `VIGNETTE_EXTENT: Final[float] = math.sqrt(2)  # radial-gradient(circle) 預設 farthest-corner`；抽一個共用 `vignette_alpha(diameter) -> np.ndarray`（放 `compose.py` 或者新 `geometry.py`），`radius / VIGNETTE_EXTENT` 先代入 55% → 100%；`_vignette` 同 `disc_visibility` 都用佢（順手 DRY 咗兩份重複公式）。加 test：碟邊 alpha ≈ 0.157、半徑 0.7 處 = 0。代價：~15 行 + 1 個 test
- 方案 B：淨係改 `VIGNETTE_START` / `VIGNETTE_ALPHA` 做「等效」數值（start 0.778、edge alpha 0.157）。代價：2 行；但數唔再對得返 CSS，下次有人改 CSS 好難跟
- 推薦：**A**

#### W-491 — 壞輸入出 traceback，兼留低半個 round 令自動編號跳號；`--round` / `--title-scale` / `--title-box` 冇驗範圍

- 位置：`scripts/arcCover/generate.py:238–248`（`run`）、`:171–185`（`_round_dir`）、`:275–299`（`_parse_box` / `_parse_args`）、`scripts/arcCover/compose.py:259–285`（`shrink_title`）
- 描述：reviewer 喺 scratch 實測：
    - `--input /nonexistent.png` → `FileNotFoundError` traceback；文字檔改名 `.png` → `PIL.UnidentifiedImageError` traceback（`main` 只 catch `GeneratorError`）
    - `--title-box 5000,5000,10,10`（超出 1200×675 原圖）→ 先 `mkdir` 咗 round 資料夾、寫咗 `analysis.png`，之後 `shrink_title` 切到空 region，`cv2.error: !src.empty() in function 'dilate'` traceback。留低嘅 `round-N/` 冇 `manifest.json`，`_round_dir` 嘅 glob 照計佢，下次自動號變 N+1，review 頁會見到跳號
    - `--round -1` 開咗 `round--1/`（`ROUND_PATTERN` 之後唔認，永遠「消失」）；`--round 0` 開 `round-0`
    - `--title-scale 0` 照行（字縮到冇）；`> 1` 會將字放大超出挖洞範圍
- 影響：用戶（或者之後砌 review 頁嘅 script）見到 stack trace 唔知點算；半個 round 會污染 round 列表，同「manifest 穩定」嘅要求相違
- 方案 A：(1) `run` 一開頭（未分析、未 mkdir）驗：input 存在、`Image.open(...).verify()` 得、`title_box` 完全喺原圖入面、`0 < title_scale <= 1`，唔啱就 `GeneratorError`；(2) `--round` 用 `type=_positive_int`；(3) 先 `_round_dir` 再分析（順手解 S-566）；(4) 輸出寫去 `round-N.partial/`，成功先 `rename` 做 `round-N/`（`--force` 時先刪舊），crash 就唔會留低半個 round。代價：~35 行 + 4 個 test
- 方案 B：(1)(2) 照做；`run` 包 `try/except`，失敗就 `shutil.rmtree(target)`（只限今次新開嘅資料夾）。代價：~20 行；但 `--force` 中途 crash 會連舊 round 一齊冇咗
- 推薦：**A**

#### W-492 — 照 README 喺 repo 根跑 pytest，留低 `.pytest_cache/README.md` 令 `npm run lint` fail

- 位置：`README.md`（arcCover 小節嘅 `python -m pytest scripts/arcCover/tests`）、`scripts/arcCover/.gitignore`、root `.gitignore`
- 描述：pytest 冇 ini 檔，rootdir 落咗 repo 根，cache 寫去 `<repo>/.pytest_cache/`。`scripts/arcCover/.gitignore` 嘅 `.pytest_cache/` 只管 `scripts/arcCover/` 底下；git 唔見係因為 pytest 自己喺 cache 入面放咗 `.gitignore`，但 **prettier 只睇 root `.gitignore` / `.prettierignore`**。reviewer 實測：跑完 test 之後 `npx prettier --check .` 多咗 `[warn] .pytest_cache/README.md`，`npm run lint`（`eslint . && prettier --check .`）會 fail；刪走 cache 就返正常（已刪）。developer 跑 ruff 亦喺 repo 根留低 `.ruff_cache/`（入面冇 prettier 認得嘅檔，暫時冇事）。
- 影響：CI 唔會跑 Python test 所以 CI 唔受影響，但本機 pre-push lint / hook 會無啦啦紅，好難估到係個 Python 工具搞出嚟
- 方案 A：root `.gitignore` 加 `.pytest_cache/`、`.ruff_cache/`、`__pycache__/`（prettier 3 會跟 root `.gitignore`，`design/previews` 已經證實咗），`scripts/arcCover/.gitignore` 可以刪。代價：3 行
- 方案 B：README 命令改 `python -m pytest -p no:cacheprovider scripts/arcCover/tests`，`ruff` 用 `--no-cache`。代價：README 2 行；但靠人記住
- 推薦：**A**（可以加埋 B 嘅 `-p no:cacheprovider`）

#### W-493 — `requirements.txt` 下限容許有 CVE 嘅版本；冇上限 / 冇記版本，determinism 只係同一個 env 先成立

- 位置：`scripts/arcCover/requirements.txt:3–5`、`scripts/arcCover/generate.py:250–268`（manifest）
- 描述：
    - `pillow>=10.0` 容許 Pillow 10.0.0：佢 bundle 嘅 libwebp 有 **CVE-2023-4863**（WebP heap overflow，High，曾被在野利用，10.0.1 修），10.0.x 亦有 CVE-2023-50447（`ImageMath.eval`，10.2.0 修）。`opencv-python-headless>=4.8` 容許 4.8.0.x，同樣 bundle 有漏洞嘅 libwebp（4.8.1.78 修）。呢個工具**接受 webp 輸入**，正正踩中。今日 pip 會裝最新版所以實際冇事，但下限寫錯會誤導用舊 venv 嘅人
    - 冇上限 / 冇 lock：Pillow 10 → 13（libwebp encoder 版本唔同）、numpy 1.26 → 2.x、OpenCV 4.8 → 4.14 都會令 webp bytes、Haar 結果、crop 位變。manifest 冇記 library version，兩個 round 喺唔同 venv 出，`sha256` / `duplicateOf` 唔可比，review 頁睇唔出點解「同一張圖」唔一樣
- 影響：安全：低（要刻意裝舊版）；可重現性：中（「manifest 穩定」只喺同一部機同一個 venv 成立）
- 方案 A：下限提到 `pillow>=10.3`、`opencv-python-headless>=4.8.1.78`；另加 `requirements.lock`（`pip freeze` 出嚟，README 用 lock 裝）；manifest 加 `"env": {"python": …, "pillow": PIL.__version__, "libwebp": PIL.features.version("webp"), "opencv": cv2.__version__, "numpy": np.__version__}`。代價：~10 行 + lock 檔
- 方案 B：只提下限 + manifest 記版本，唔做 lock。代價：~8 行；跨機仍然可能唔同，但起碼睇得出原因
- 推薦：**A**

#### W-494 — 三個函數超過 30 行

- 位置：`scripts/arcCover/generate.py:202–235`（`_write_variants`，34 行）、`:238–272`（`run`，35 行）、`scripts/arcCover/preview.py:72–105`（`render_disc`，34 行）
- 描述：`_write_variants` 同時做寫 webp、hash、解碼、砌預覽、標 duplicate、砌 contact sheet；`run` 驗 slug + 分析 + 開資料夾 + 砌 manifest + 寫檔；`render_disc` 碟邊 + face + 暗角 + 坑紋 + 碟心 + ring 一齊。
- 影響：W-491 / W-493 要加嘢入 `run`，會再長；`render_disc` 改一層（例如 S-564）要讀成個函數
- 方案 A：`_write_variants` 抽 `_write_one(item, target, prefix, theme) -> (entry, preview)`；`run` 抽 `_validate(options)` 同 `_build_manifest(...)`；`render_disc` 抽 `_draw_grooves(canvas, …)` 同 `_draw_spindle(canvas, …)`。代價：純搬位，~0 行淨增
- 方案 B：只拆 `run`（因為 W-491 會加長佢），其餘兩個加註解。代價：細；但仍然違反規則
- 推薦：**A**

#### W-495 — `constants.py` 之外仲有好多 inline magic number

- 位置（舉例）：`compose.py:261`（`pad = … * 0.15`）、`:272`（inpaint radius `5`）、`:274`（blur `1.2`）、`:215`（`distance * 3`）、`:205`（`max(4, …)`）、`:207`（sigma `3`）；`analysis.py:115`（`/ 80`）、`:149`（`max(24, …)`）、`:138`（`max(8, …)`）、`:188`（`/ 40`）、`:199`（`0.6`）、`:200`（`/ 60`）；`preview.py:132–145`（`40`、`60`、`16`、`24`、`- 6`）、`:182–183`（`14`）、`:174`（`0.6` / `0.4` 混色）
- 描述：`constants.py` 已經有齊大部份參數同註解，但 inpaint、筆劃 close、人面最細、預覽排版呢啲仍然係數字；部份（例如 `compose.py:261` 嘅 0.15 同 `TITLE_HOLE_RATIO` 0.08）其實係同一組概念但分開兩度
- 影響：調參（developer 自己都講 title-shrink / 字偵測要再調）要喺三個檔搵數字，容易改漏
- 方案 A：分析 / 合成參數全部搬入 `constants.py`（有單位註解）；預覽排版數字喺 `preview.py` 頂集中做 `PAGE_MARGIN_PX` / `COLUMN_GAP_PX` 等。代價：~25 行常數
- 方案 B：只搬會調嘅參數（inpaint、字偵測、人面），預覽排版保留但加註解。代價：~12 行
- 推薦：**A**

### 🟢 Suggestion

#### S-560 — `duplicateOf` 有時有、有時冇；manifest 冇 schema

- 位置：`scripts/arcCover/generate.py:229–232`；`tests/test_generate.py:229`
- 描述：冇 duplicate 時成個 key 唔出，review 頁要寫 `v.duplicateOf ?? null`；test 嘅 `VARIANT_KEYS` 冇包 `duplicateOf`、`level`，亦冇 test 驗 duplicate 標記（假封面 800×450 = 16:9，其實出到 duplicate，但冇 assert）。repo 已經有 `schemas/drama.schema.json` 嘅做法。
- 建議：永遠寫 `"duplicateOf": null`；加 `schemas/arcCover-manifest.schema.json`（或者喺 README 列齊欄位）+ test 驗 16:9 輸入嗰 4 個 tile 標 `duplicateOf: "tile-center-crop"`

#### S-561 — README 嘅 manifest 欄位清單唔齊

- 位置：`README.md` arcCover 小節（`manifest.json：… { kind, file, method, params, width, height, sha256 }`）
- 描述：漏咗 `id`、`preview`、`duplicateOf`、`level`、`source.width/height`、`analysisImage`、`contactSheet`；review 頁作者會照 README 寫。「同一張圖、同一組參數輸出完全一樣」要補「同一個 venv」（W-493）。
- 建議：列齊欄位，或者指去 S-560 嘅 schema

#### S-562 — `--force` 唔清舊檔

- 位置：`scripts/arcCover/generate.py:183–185`、`:205`
- 描述：第一次有 `--title-box`（出 `*-disc-title-shrink.webp` + 預覽），之後 `--force` 冇 `--title-box` 重出，舊 title-shrink 檔仲喺資料夾，但 manifest 冇。睇資料夾 / contact sheet 以外嘅工具會撈錯。
- 建議：`--force` 先刪走舊 round（或者配合 W-491 方案 A 嘅 `.partial` + rename）

#### S-563 — 人面路徑、CLI 冇 test；face-crop 放大冇上限冇提示

- 位置：`analysis.py:136–142`、`:159–163`（coverage 冇行到）；`generate.py:275–314`；`compose.py:166–179`
- 描述：假封面冇人面，所以 face-crop 一直行 saliency fallback；`_has_eye`、flip 座標換算（`width - x - w`）冇 test。face-crop 冇最細窗口：第一輪 `heart` disc-face-crop 375 px 放大 **1.60×**、`half` 409 px 放大 **1.47×**，manifest 冇標。
- 建議：test 砌一個合成人面（或者 mock `detect_faces`）驗 flip 換算同 face-crop 窗口；`subject_window` 加最細窗口（例如輸出邊長 × 0.75）；variant `params` 加 `"upscale": 1.6`，review 頁可以提示

#### S-564 — 細碟預覽漏咗 `.small` 嘅 3px divider 外圈

- 位置：`scripts/arcCover/preview.py:72–105`
- 描述：`Disc.module.css` `.small { box-shadow: 0 0 0 3px var(--color-divider) }`，40px 細碟外面有一圈；預覽冇畫。細碟最睇外圈對比，影響判斷。
- 建議：`DEFAULT_THEME` 加 `divider`（`drama.json` 冇就由 tokens 推），細碟畫 3px 外圈

#### S-565 — `ruff` 唔喺 `requirements.txt`、README 冇講點 lint

- 位置：`scripts/arcCover/requirements.txt`、`ruff.toml`、README
- 建議：requirements 加 `ruff>=0.6`（或者分開 `requirements-dev.txt`），README 加 `ruff check scripts/arcCover && ruff format --check scripts/arcCover`

#### S-566 — 細節：`assert` 做流程控制、`Image.open` 冇 close、「round 已存在」喺分析之後先報

- 位置：`generate.py:139`、`:310`（`assert`，`python -O` 會被拎走）；`:214`（`Image.open(...)` 冇 `with`，ResourceWarning）；`:243–245`（`analyse` 喺 `_round_dir` 之前，round 已存在要等幾秒分析完先話你知）
- 建議：改 `if … : raise`；`with Image.open(...) as image:`；先 `_round_dir` 再分析

---

## ✅ 做得好嘅地方

- **尺寸同 app 幾何有出處**：每個常數都註明對應 `Disc.module.css` / `tokens.css` 邊一行，reviewer 逐個對得返（除咗 W-490 嘅 `farthest-corner` 陷阱）；細碟唔畫暗角 / 坑紋都跟足 `Disc.tsx`。
- **Determinism 認真做**：冇用 `hash()`、seed 用 `crc32`、`_merge_boxes` 按位置排序、打和揀最近中間（唔會跟浮點雜訊跳），test 直接比兩次輸出嘅 manifest bytes；reviewer 跨 process 重跑第一輪 byte 一樣。
- **預覽由解碼返嘅 webp 砌**，用戶睇到嘅係真正會 commit 嘅壓縮結果。
- **`duplicateOf`** 呢個細節好貼心：16:9 原圖 5 個 tile 方法有 4 個一樣，review 頁唔使睇幾次。
- **text-safe crop 諗得仔細**：方窗口切字 > 圓形切角，避唔到就至少成行字喺圖入面；揀位後再 snap，補返縮圖誤差。
- **`fit-extend` 唔靠 inpaint + 模糊**，用漸變底色 + 同高度抽顆粒，避開「搽花」問題。
- **slug 驗證**喺任何讀寫之前，`../` 入唔到；test 唔使網絡，假封面砌得有心（有「人」有「字」）。
- **README 清楚講明唔屬於 app build、點裝 venv、OpenCV 要 4.x 嘅原因、r2.dev 對 urllib 回 403 要用 curl。**

## 修正優先順序

| 優先 | ID    | 工作量 | 說明                                                                   |
| ---- | ----- | ------ | ---------------------------------------------------------------------- |
| 1    | W-490 | 細     | 暗角用 `farthest-corner`（× √2），預覽同 `disc_visibility` 共用        |
| 2    | W-492 | 細     | root `.gitignore` 加 `.pytest_cache/` 等，唔好整爛 `npm run lint`      |
| 3    | W-491 | 中     | 先驗輸入 / `--round` / `--title-*`，`.partial` + rename 唔留半個 round |
| 4    | W-493 | 細     | 提下限（Pillow 10.3、OpenCV 4.8.1.78）、lock 檔、manifest 記版本       |
| 5    | W-494 | 中     | 拆 `_write_variants` / `run` / `render_disc`                           |
| 6    | W-495 | 中     | inline 數字搬入 `constants.py`                                         |
| 7    | S-560 | 細     | `duplicateOf: null` 永遠寫 + schema / test                             |
| 8    | S-563 | 中     | 人面 / CLI test、face-crop 最細窗口 + `upscale` 欄位                   |
| 9    | S-562 | 細     | `--force` 清舊檔（W-491 A 順手解）                                     |
| 10   | S-564 | 細     | 細碟 3px divider 外圈                                                  |
| 11   | S-561 | 細     | README manifest 欄位                                                   |
| 12   | S-565 | 細     | ruff 入 requirements + README                                          |
| 13   | S-566 | 細     | `assert` / `with Image.open` / 先查 round                              |

## 修訂後代碼（W-490 / W-491 / W-493 示意，未套用）

```python
# constants.py
# W-490：radial-gradient(circle, …) 冇寫大小 = farthest-corner，100% 喺角，即係碟半徑 × √2
VIGNETTE_EXTENT: Final[float] = math.sqrt(2)


# compose.py（preview._vignette 同 disc_visibility 共用，唔好兩份公式）
def vignette_alpha(size: Size) -> np.ndarray:
    """Disc.module.css .vignette 喺每個像素嘅黑色 alpha（0–VIGNETTE_ALPHA），radius 1 = 碟邊。"""
    width, height = size
    ys, xs = np.indices((height, width), dtype=np.float32)
    radius = np.hypot((xs + 0.5) / width - 0.5, (ys + 0.5) / height - 0.5) * 2
    position = radius / VIGNETTE_EXTENT  # 換成 gradient 嘅 0–100%
    return np.clip((position - VIGNETTE_START) / (1 - VIGNETTE_START), 0, 1) * VIGNETTE_ALPHA


# generate.py — W-491：未分析、未 mkdir 之前先驗晒
def _validate(options: Options) -> None:
    for slug in filter(None, (options.drama, options.arc)):
        if not SLUG_PATTERN.match(slug):
            raise GeneratorError(f"slug 只可以用細楷英文、數字同 -：{slug!r}")
    if not options.input.is_file():
        raise GeneratorError(f"搵唔到封面相：{options.input}")
    try:
        with Image.open(options.input) as image:
            image.verify()
            width, height = image.size
    except (OSError, SyntaxError) as error:
        raise GeneratorError(f"讀唔到圖：{options.input}（{error}）") from error
    if not 0 < options.title_scale <= 1:
        raise GeneratorError("--title-scale 要大過 0、最多 1")
    box = options.title_box
    if box is not None and (box.x < 0 or box.y < 0 or box.right > width or box.bottom > height):
        raise GeneratorError(f"--title-box 超出原圖 {width}×{height}")


def _positive_int(value: str) -> int:
    number = int(value)
    if number < 1:
        raise argparse.ArgumentTypeError("round 要 ≥ 1")
    return number


# W-493：manifest 記低會影響 bytes 嘅版本
def _environment() -> dict[str, str]:
    return {
        "python": platform.python_version(),
        "pillow": PIL.__version__,
        "libwebp": str(PIL.features.version("webp")),
        "opencv": cv2.__version__,
        "numpy": np.__version__,
    }
```

## Handoff receipt

```handoff-receipt
protocol: 1
status: fail
score: 63/100
hard_gates:
  lint: pass
  type_check: n/a
  tests: pass
  coverage: pass
  no_critical: pass
  security_scan: pass
next_action: invoke_developer
next_agent: developer
branch: "claude/keen-pascal-5iifg0"
context: "arcCover generator review (cb973cd, b028f75, merged 56f078f). FAIL 63 by score only (gates pass, 0 Critical). Verified: sizes match all 40 committed webp (disc 600x600, arc tile 1216x684, drama tile 1216x608); Disc/ArcSheet/DramaShelf geometry matches CSS except vignette; reviewer regenerated half round-1 in fresh out dir -> manifest byte-identical (12 sha256 equal); slug regex blocks path traversal; ruff check/format clean; prettier clean on README+scripts/arcCover; pytest 9 pass no network; coverage 93% (analysis 85, compose 98, generate 83, preview 99). Fix: W-490 vignette uses disc radius as 100% but CSS radial-gradient(circle) defaults to farthest-corner (radius*sqrt2) -> preview edge 45% vs app ~16% black, starts at 0.55R vs 0.78R; also skews disc_visibility crop weights -> add VIGNETTE_EXTENT and share one vignette_alpha. W-491 missing/unreadable input and out-of-bounds --title-box give tracebacks; title-box crash leaves round-N without manifest (auto numbering skips); --round -1 creates round--1; --title-scale 0/>1 accepted -> validate before analysis/mkdir, write to .partial then rename. W-492 README pytest from repo root writes <repo>/.pytest_cache/README.md which fails prettier --check . (npm run lint) -> add .pytest_cache/.ruff_cache/__pycache__ to root .gitignore. W-493 requirements floors allow Pillow 10.0.0 / opencv 4.8.0 (bundled libwebp CVE-2023-4863; Pillow CVE-2023-50447) on a tool that reads webp; no lock and no lib versions in manifest so sha256/duplicateOf only stable within one venv -> pillow>=10.3, opencv-python-headless>=4.8.1.78, lock file, manifest env block. W-494 _write_variants 34, run 35, render_disc 34 lines. W-495 inline magic numbers in compose/analysis/preview. S-560 duplicateOf absent instead of null, no manifest schema/test. S-561 README manifest field list incomplete. S-562 --force leaves stale files. S-563 face path and CLI untested; face-crop upscales 1.6x (heart) / 1.47x (half) without flag. S-564 small disc preview missing 3px divider ring. S-565 ruff not in requirements/README. S-566 assert as control flow, unclosed Image.open, round-exists check after analysis. TDD: tests and code in one commit, no red evidence - ask developer. No version bump (tooling-only, precedent). Not pushed."
```
