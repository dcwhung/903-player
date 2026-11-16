/*
 * App 圖示輸出（plan 2026-11-13 App 外觀 · Q1 / Q6）：一張原圖裁正方形 → 五張 PNG
 * （favicon 64、apple-touch 180、icon 192 / 512、maskable 512）。每張屬於一種裝置：
 * iPhone（apple-touch）、Android（192 / 512 / maskable，圓形同方形係同一張，由手機套遮罩）、瀏覽器分頁（favicon）。
 * 「所有裝置使用同一裁切」= 一個框管晒；取消勾選後每種裝置各自一個框。
 * 重新裁切（icon recrop）：由原圖 + 上次嘅框（IconSeed）開始，撳邊個裝置預覽就預先揀嗰個裝置
 * Design Origin: mockup: _mockups_/admin-appearance/index.html#b
 */
import { ASSET_DIMENSIONS } from '@903-player/catalog';
import type { BrandingIcon } from '../../api/types';
import type { CropRect } from '../../ui/cropGeometry';
import type { Size } from '../../ui/imageUpload';
import type { MessageKey } from '../../i18n/t';

export const ICON_DEVICES = ['ios', 'android', 'tab'] as const;

export type IconDevice = (typeof ICON_DEVICES)[number];

export type IconKey = Exclude<keyof BrandingIcon, 'maskableBackground' | 'source'>;

export interface IconOutput {
    key: IconKey;
    device: IconDevice;
    size: Size;
    /** maskable：裁切框畫滿成張圖，透明位填遮罩底色；安全區 = 中間 80% 圓（編輯器虛線圈） */
    maskable: boolean;
}

/** 上載次序 = 呢個次序 */
export const ICON_OUTPUTS: readonly IconOutput[] = [
    { key: 'favicon', device: 'tab', size: ASSET_DIMENSIONS.iconFavicon, maskable: false },
    { key: 'appleTouch', device: 'ios', size: ASSET_DIMENSIONS.iconAppleTouch, maskable: false },
    { key: 'icon192', device: 'android', size: ASSET_DIMENSIONS.icon192, maskable: false },
    { key: 'icon512', device: 'android', size: ASSET_DIMENSIONS.icon512, maskable: false },
    { key: 'maskable', device: 'android', size: ASSET_DIMENSIONS.iconMaskable, maskable: true },
];

/** 裁切框比例（正方形）：用最大嗰張 */
export const ICON_SQUARE: Size = ASSET_DIMENSIONS.icon512;

/** 原圖短邊細過呢個數（= 最大輸出 512）就黃色警告 */
export const ICON_SOURCE_MIN_PX = ASSET_DIMENSIONS.icon512.width;

export const isSmallIconSource = ({ width, height }: Size) =>
    Math.min(width, height) < ICON_SOURCE_MIN_PX;

export type IconBoxes = Record<IconDevice, CropRect>;

/** 同一裁切 = 全部用 shared；各自裁切 = 自己調過嘅框，未調過照用 shared */
export const boxesFor = (same: boolean, shared: CropRect, own: Partial<IconBoxes>): IconBoxes => ({
    ios: same ? shared : (own.ios ?? shared),
    android: same ? shared : (own.android ?? shared),
    tab: same ? shared : (own.tab ?? shared),
});

/** 開 dialog 嘅起點：全部冇 = 新揀嘅檔（預設置中裁切、同一裁切） */
export interface IconSeed {
    /** 撳咗邊個裝置預覽：嗰個裝置單獨調（取消「同一裁切」） */
    device?: IconDevice;
    /** 已存喺 R2 嘅原圖檔名；冇 = 上載時要連原圖一齊上載 */
    storedName?: string;
    /** 上次嘅框（原圖像素） */
    boxes?: IconBoxes;
    same?: boolean;
    /** 上次嘅遮罩底色；冇 = 第一個抽色 */
    background?: string;
    /** 舊圖示冇原圖：用 512 圖示頂住（dialog 出提示） */
    fallback?: boolean;
}

export interface InitialCrop {
    same: boolean;
    device: IconDevice;
    shared: CropRect;
    own: Partial<IconBoxes>;
}

const DEFAULT_DEVICE: IconDevice = 'ios';

/** 撳裝置預覽 = 單獨調嗰個（其他裝置保留上次嘅框）；冇揀裝置 = 跟上次（新檔 = 同一裁切） */
export const initialCrop = (defaultBox: CropRect, seed: IconSeed): InitialCrop => {
    const device = seed.device ?? DEFAULT_DEVICE;
    const { boxes } = seed;
    return {
        same: seed.device === undefined && (seed.same ?? true),
        device,
        shared: boxes ? boxes[device] : defaultBox,
        own: boxes ? { ...boxes } : {},
    };
};

/** 上次嘅底色唔喺抽色入面（例如內建底色）就排第一個，揀得返 */
export const withSwatch = (swatches: string[], colour: string | undefined): string[] =>
    colour === undefined || swatches.includes(colour) ? swatches : [colour, ...swatches];

/** 裁切框顯示（Q6）：同一裁切顯示安全區、唔圓；Android 單獨調 = 圓 + 安全區；其他 = 方框 */
export interface IconCropView {
    round: boolean;
    safe: boolean;
    cap: MessageKey;
    out: MessageKey;
}

const OUT_KEY: Record<IconDevice, MessageKey> = {
    ios: 'appearance.icon.outIos',
    android: 'appearance.icon.outAndroid',
    tab: 'appearance.icon.outTab',
};

const CAP_KEY: Record<IconDevice, MessageKey> = {
    ios: 'appearance.icon.cropIos',
    android: 'appearance.icon.cropAndroid',
    tab: 'appearance.icon.cropTab',
};

export const cropView = (same: boolean, device: IconDevice): IconCropView =>
    same
        ? {
              round: false,
              safe: true,
              cap: 'appearance.icon.cropSame',
              out: 'appearance.icon.outSame',
          }
        : {
              round: device === 'android',
              safe: device === 'android',
              cap: CAP_KEY[device],
              out: OUT_KEY[device],
          };

/** 卡上撳得嘅裝置（瀏覽器分頁唔使：用戶要求淨係 iPhone / Android） */
export type AdjustableDevice = Extract<IconDevice, 'ios' | 'android'>;

/** 預覽列嘅 iPhone / Android 兩格（Android 圓形同方形係同一張 maskable，都開 Android） */
export interface IconPreviewSlot {
    view: 'ios' | 'round' | 'square';
    device: AdjustableDevice;
    label: MessageKey;
    adjustLabel: MessageKey;
    className: string;
}

export const ICON_PREVIEW_SLOTS: readonly IconPreviewSlot[] = [
    {
        view: 'ios',
        device: 'ios',
        label: 'appearance.icon.previewIos',
        adjustLabel: 'appearance.icon.adjustIos',
        className: 'ios',
    },
    {
        view: 'round',
        device: 'android',
        label: 'appearance.icon.previewRound',
        adjustLabel: 'appearance.icon.adjustRound',
        className: 'android',
    },
    {
        view: 'square',
        device: 'android',
        label: 'appearance.icon.previewSquare',
        adjustLabel: 'appearance.icon.adjustSquare',
        className: 'android sq',
    },
];
