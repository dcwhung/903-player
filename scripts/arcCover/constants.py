"""封面 generator 用嘅常數：app 實際尺寸、碟面疊層幾何、各個方法嘅參數。

碟面幾何跟 src/components/Disc/Disc.module.css；尺寸跟 src/dramas/*/ 已 commit 嘅 webp。
"""

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
MANIFEST_SCHEMA: Final[int] = 1
TOOL_VERSION: Final[str] = "1.0.0"

# ---- 碟面疊層（Disc.module.css） ----
SPINDLE_RATIO: Final[float] = 0.12  # .spindle width: 12%
SMALL_SPINDLE_RATIO: Final[float] = 0.20  # .small .spindle width: 20%
VIGNETTE_START: Final[float] = 0.55  # radial-gradient transparent 55%
VIGNETTE_ALPHA: Final[float] = 0.45  # --color-disc-vignette rgb(0 0 0 / 45%)
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
TEXT_MIN_AREA_RATIO: Final[float] = 0.002
TEXT_MAX_AREA_RATIO: Final[float] = 0.15
TEXT_MIN_FILL: Final[float] = 0.08
TEXT_MAX_FILL: Final[float] = 0.6
TEXT_MIN_SATURATION: Final[float] = 60.0  # 筆劃像素 HSV S（0–255）第 75 百分位：標題字多數有顏色
TEXT_SATURATION_PERCENTILE: Final[float] = 75.0
TEXT_CUT_PENALTY: Final[float] = 10.0

# ---- 合成 ----
BLUR_SIGMA_RATIO: Final[float] = 1 / 25  # 模糊背景 sigma = 輸出短邊 × 比例
BLUR_DIM: Final[float] = 0.85  # 模糊背景調暗，令主體突出
EXTEND_BAND_RATIO: Final[float] = 0.06  # 延伸補底取邊緣幾厚做樣本
EXTEND_SMOOTH_SIGMA: Final[float] = 12.0
EXTEND_SEAM_PX: Final[int] = 10
TITLE_SHRINK_SCALE: Final[float] = 0.85
TITLE_DIFF_THRESHOLD: Final[int] = 40
DETERMINISTIC_SEED: Final[int] = 903
