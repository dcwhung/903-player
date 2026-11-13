/*
 * App 圖示輸出（plan 2026-11-13 App 外觀 · Q1 / Q6）：一張原圖裁正方形 → 五張 PNG
 * （favicon 64、apple-touch 180、icon 192 / 512、maskable 512）。每張屬於一種裝置：
 * iPhone（apple-touch）、Android（192 / 512 / maskable，圓形同方形係同一張，由手機套遮罩）、瀏覽器分頁（favicon）。
 * 「所有裝置使用同一裁切」= 一個框管晒；取消勾選後每種裝置各自一個框
 * Design Origin: mockup: _mockups_/admin-appearance/index.html#b
 */
import { ASSET_DIMENSIONS } from '@903-player/catalog';
import type { BrandingIcon } from '../../api/types';
import type { CropRect } from '../../ui/cropGeometry';
import type { Size } from '../../ui/imageUpload';
import type { MessageKey } from '../../i18n/t';

export const ICON_DEVICES = ['ios', 'android', 'tab'] as const;

export type IconDevice = (typeof ICON_DEVICES)[number];

export type IconKey = Exclude<keyof BrandingIcon, 'maskableBackground'>;

export interface IconOutput {
    key: IconKey;
    device: IconDevice;
    size: Size;
    /** maskable：圖縮入安全區、四周填遮罩底色 */
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

/** Maskable 安全區：中間 80%（W3C maskable icon 規格） */
export const MASKABLE_SAFE_RATIO = 0.8;

/** 原圖短邊細過呢個數（= 最大輸出 512）就黃色警告 */
export const ICON_SOURCE_MIN_PX = ASSET_DIMENSIONS.icon512.width;

export const isSmallIconSource = ({ width, height }: Size) =>
    Math.min(width, height) < ICON_SOURCE_MIN_PX;

/** 安全區喺 size 入面嘅位置（置中） */
export const safeRect = ({ width, height }: Size): CropRect => {
    const inner = { width: width * MASKABLE_SAFE_RATIO, height: height * MASKABLE_SAFE_RATIO };
    return { x: (width - inner.width) / 2, y: (height - inner.height) / 2, ...inner };
};

export type IconBoxes = Record<IconDevice, CropRect>;

/** 同一裁切 = 全部用 shared；各自裁切 = 自己調過嘅框，未調過照用 shared */
export const boxesFor = (same: boolean, shared: CropRect, own: Partial<IconBoxes>): IconBoxes => ({
    ios: same ? shared : (own.ios ?? shared),
    android: same ? shared : (own.android ?? shared),
    tab: same ? shared : (own.tab ?? shared),
});

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
