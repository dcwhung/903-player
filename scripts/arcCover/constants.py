"""封面 generator 用嘅常數：app 實際尺寸、碟面疊層幾何、各個方法嘅參數。

碟面幾何跟 src/components/Disc/Disc.module.css；尺寸跟 src/dramas/*/ 已 commit 嘅 webp。
"""

import math
from typing import Final, Literal, TypeAlias

Kind: TypeAlias = Literal["disc", "tile"]
DISC: Final[Kind] = "disc"
TILE: Final[Kind] = "tile"

Method: TypeAlias = Literal[
    "center-crop",
    "saliency-crop",
    "face-crop",
    "text-safe-crop",
    "fit-blur",
    "fit-extend",
    "title-shrink",
]
CENTER_CROP: Final[Method] = "center-crop"
SALIENCY_CROP: Final[Method] = "saliency-crop"
FACE_CROP: Final[Method] = "face-crop"
TEXT_SAFE_CROP: Final[Method] = "text-safe-crop"
FIT_BLUR: Final[Method] = "fit-blur"
FIT_EXTEND: Final[Method] = "fit-extend"
TITLE_SHRINK: Final[Method] = "title-shrink"

# ---- 輸出尺寸（同 repo 入面現有 webp 一致） ----
DISC_SIZE: Final[tuple[int, int]] = (600, 600)
# 短篇 tile 係 16:9；廣播劇本身嘅 tile（書架 2:1）係 1216×608
ARC_TILE_SIZE: Final[tuple[int, int]] = (1216, 684)
DRAMA_TILE_SIZE: Final[tuple[int, int]] = (1216, 608)
# 書架 tile 嘅 aspect-ratio（tokens.css --drama-tile-aspect-w / -h）
SHELF_ASPECT: Final[float] = 2.0
WEBP_QUALITY: Final[int] = 88
WEBP_METHOD: Final[int] = 6

# 冇 --arc 時嘅資料夾名（廣播劇本身嘅封面）
DRAMA_LEVEL_SLUG: Final[str] = "_drama"
# schema 2：加 env、duplicateOf 永遠有（冇重複 = null）；欄位見 manifest.schema.json
MANIFEST_SCHEMA: Final[int] = 2
TOOL_VERSION: Final[str] = "1.1.0"

# ---- 碟面疊層（Disc.module.css） ----
SPINDLE_RATIO: Final[float] = 0.12  # .spindle width: 12%
SMALL_SPINDLE_RATIO: Final[float] = 0.20  # .small .spindle width: 20%
VIGNETTE_START: Final[float] = 0.55  # radial-gradient transparent 55%
VIGNETTE_ALPHA: Final[float] = 0.45  # --color-disc-vignette rgb(0 0 0 / 45%)
# radial-gradient(circle, …) 冇寫大小 = farthest-corner：100% 喺角，即係碟半徑 × √2
VIGNETTE_EXTENT: Final[float] = math.sqrt(2)
GROOVE_INSETS: Final[tuple[float, ...]] = (0.10, 0.22, 0.34)
GROOVE_ALPHA: Final[float] = 0.14  # --color-disc-groove
SPINDLE_RING_ALPHA: Final[float] = 0.50  # --color-spindle-ring
SPINDLE_RING_CSS_PX: Final[int] = 3
RIM_CSS_PX: Final[int] = 10  # .large box-shadow 0 0 0 10px rim
# 手機直版播放器大碟大約闊度（72% × 約 390px），用嚟將 CSS px 換算成預覽 px
PHONE_DISC_CSS_PX: Final[int] = 280
ARC_RING_CSS_PX: Final[int] = 52  # --arc-sheet-ring
ARC_RING_WIDTH_CSS_PX: Final[int] = 4  # --arc-sheet-ring-width（--space-1）
SMALL_DISC_CSS_PX: Final[int] = 40
SMALL_RING_CSS_PX: Final[int] = 3  # .small box-shadow 0 0 0 3px var(--color-divider)（= theme track）
TILE_RADIUS_CSS_PX: Final[int] = 14  # --radius-tile

# 冇 drama.json theme 時嘅預覽顏色（蘭茜夫人劇場淺色主題）
DEFAULT_THEME: Final[dict[str, str]] = {
    "bg": "#f3efde",
    "surface": "#faf7ec",
    "track": "#e0d6b8",
    "accent": "#d45f32",
}

# ---- 分析 ----
ANALYSIS_SHORT_SIDE: Final[int] = 160  # 搵 crop 位時嘅縮圖短邊
SALIENCY_WIDTH: Final[int] = 64  # spectral residual 嘅工作闊度
SALIENCY_BLUR_SIGMA: Final[float] = 2.5
FACE_WEIGHT: Final[float] = 1.0  # 人面相對 saliency 最高值嘅加權
FACE_MIN_RATIO: Final[float] = 0.07  # 人面最細 = 短邊 7%
FACE_MIN_NEIGHBOURS: Final[int] = 3
FACE_SCALE_STEP: Final[float] = 1.05
# 人面框上半要搵到至少一隻眼先算（Haar 喺風格化封面好多誤報）
EYE_REGION_RATIO: Final[float] = 0.6
EYE_MIN_RATIO: Final[float] = 0.1
FACE_MERGE_IOU: Final[float] = 0.3
FACE_CROP_MARGIN: Final[float] = 0.9  # 人面框四邊再加幾多倍框邊
# face-crop 最多放大幾多倍（輸出邊長 ÷ 窗口邊長）：人面細就撐大窗口，唔好放大到朦；原圖本身太細除外
FACE_CROP_MAX_UPSCALE: Final[float] = 1.25
# 碟面中間有碟心擋住：人面中心放喺窗口高度呢個比例，唔好畀碟心蓋住塊面
DISC_FACE_CENTRE_Y: Final[float] = 0.40
TILE_FACE_CENTRE_Y: Final[float] = 0.45
SALIENT_BOX_PERCENTILE: Final[float] = 90  # 冇人面時，主體 = saliency 最高 10% 嘅範圍
# 「成個字喺入面 / 完全喺出面」嘅容差
TEXT_INSIDE: Final[float] = 0.98
TEXT_OUTSIDE: Final[float] = 0.02
CENTRE_TIE_BREAK: Final[float] = 1e-6  # 分數打和揀最近中間
CIRCLE_CLIP_CUT: Final[float] = 0.3  # 字喺方窗口入面但角落出咗圓：輕微扣分
# 揀咗位之後，字框差幾多就推埋（縮圖 1 px ≈ 原圖幾 px）
SNAP_MIN_PX: Final[int] = 4
SNAP_RATIO: Final[float] = 0.05
TEXT_MIN_AREA_RATIO: Final[float] = 0.002
TEXT_MAX_AREA_RATIO: Final[float] = 0.15
TEXT_MIN_FILL: Final[float] = 0.08
TEXT_MAX_FILL: Final[float] = 0.6
TEXT_MIN_SATURATION: Final[float] = 60.0  # 筆劃像素 HSV S（0–255）第 75 百分位：標題字多數有顏色
TEXT_SATURATION_PERCENTILE: Final[float] = 75.0
TEXT_CUT_PENALTY: Final[float] = 10.0
NORMALISE_EPS: Final[float] = 1e-9  # 成張圖差唔多一樣色就當冇 saliency
SPECTRUM_EPS: Final[float] = 1e-8  # log 前加少少，避開 log(0)
SALIENCY_MIN_HEIGHT: Final[int] = 8  # spectral residual 工作圖最矮幾多 px
SPECTRAL_AVERAGE_PX: Final[int] = 3  # log 振幅平均濾波（Hou & Zhang 用 3×3）
SALIENCY_SPECTRAL_WEIGHT: Final[float] = 0.5  # spectral residual 同顏色對比各佔一半
COLOUR_CONTRAST_SIGMA_DIVISOR: Final[float] = 80  # 顏色對比模糊 sigma = 長邊 ÷ 80
FACE_MIN_PX: Final[int] = 24  # Haar 人面最細 px（細過呢個誤報太多）
EYE_MIN_PX: Final[int] = 8
FACE_HEAT_HEIGHT_RATIO: Final[float] = 0.6  # 人面熱區橢圓半高 = 框高 × 0.6（包埋頭髮 / 下巴）
FACE_HEAT_SIGMA_DIVISOR: Final[float] = 60  # 人面熱區模糊 sigma = 長邊 ÷ 60
FULL_TURN_DEG: Final[int] = 360
FOCAL_PERCENTILE: Final[float] = 80  # 焦點只計 saliency 最高 20%
STROKE_KERNEL_PX: Final[int] = 3  # 筆劃梯度 kernel
TEXT_COLOUR_BLUR_SIGMA: Final[float] = 2  # 量筆劃顏色前先模糊，邊緣像素食到字色
TEXT_CLOSE_MIN_PX: Final[int] = 3
TEXT_CLOSE_DIVISOR: Final[float] = 40  # 筆劃黐埋做一嚿：close kernel = 短邊 ÷ 40

# ---- 合成 ----
BLUR_SIGMA_RATIO: Final[float] = 1 / 25  # 模糊背景 sigma = 輸出短邊 × 比例
BLUR_DIM: Final[float] = 0.85  # 模糊背景調暗，令主體突出
EXTEND_BAND_RATIO: Final[float] = 0.06  # 延伸補底取邊緣幾厚做樣本
EXTEND_SMOOTH_SIGMA: Final[float] = 12.0
EXTEND_FAR_SIGMA: Final[float] = EXTEND_SMOOTH_SIGMA * 4  # 最外嘅底色：橫向好平滑嘅平均色
EXTEND_EDGE_SIGMA: Final[float] = 3  # 貼住原圖嗰行底色只輕微平滑
EXTEND_GRAIN_SIGMA: Final[float] = 3  # 顆粒 = 邊緣帶減咗呢個 sigma 模糊之後嘅高頻
EXTEND_ROW_SIGMA: Final[float] = 0.1  # 橫向平滑時直向唔模糊
EXTEND_BAND_MIN_ROWS: Final[int] = 4
EXTEND_FADE_RATE: Final[float] = 3  # 延伸頭 1/3 由邊緣色漸變到平均色
GRAIN_CLIP_MAD: Final[float] = 3.0  # 補底顆粒最多幾多個 MAD：只要細紋理，唔要物件輪廓
EXTEND_SEAM_KERNEL: Final[tuple[int, int]] = (1, 5)  # 接駁位垂直模糊 kernel（闊, 高）
EXTEND_SEAM_PX: Final[int] = 10
TITLE_SHRINK_SCALE: Final[float] = 0.85
TITLE_DIFF_THRESHOLD: Final[int] = 40
TITLE_PAD_RATIO: Final[float] = 0.15  # 摳字範圍 = 字框四邊再加長邊 × 0.15（inpaint 要有底參考）
TITLE_HOLE_MIN_PX: Final[int] = 6  # 挖洞比字框再大少少，連外框 / 陰影一齊摳走
TITLE_HOLE_RATIO: Final[float] = 0.08
TITLE_INPAINT_RADIUS: Final[int] = 5
TITLE_ALPHA_DILATE_PX: Final[int] = 3  # 字 mask 擴少少再模糊做 alpha，邊緣唔會鋸齒
TITLE_ALPHA_BLUR_SIGMA: Final[float] = 1.2
DETERMINISTIC_SEED: Final[int] = 903
