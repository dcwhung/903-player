/*
 * App 外觀：內建預設（player 而家寫死嘅值）+ 名稱與簡介表格嘅草稿邏輯 + 卡上預覽用嘅圖 URL
 * + 撳預覽重新裁切時由邊張原圖開始（icon recrop）
 * Design Origin: mockup: _mockups_/admin-appearance/index.html#a / #c
 */
import type { BrandingIcon, BrandingText } from '../../api/types';
import { imageUrl } from '../../api/endpoints';
import builtInSource from '../../assets/icon/app-icon.png';
import maskableDefault from '../../assets/icon/icon-maskable-192.png';
import type { IconDevice, IconSeed } from './iconModel';

/** Player 內建（apps/player/index.html og:title / description、manifest short_name） */
export const BUILT_IN_TEXT = {
    name: '903 叱咤 Player',
    shortName: '903 Player',
    description: '903 叱咤 Player：隨時隨地，音樂・節目・一click即聽。',
} as const;

/** 短名超過幾多個字元出黃色提示（主畫面圖示下面會截斷，Q2） */
export const SHORT_NAME_WARN_LENGTH = 12;

/** 字元數（emoji / 中文都當一個） */
export const charCount = (text: string) => [...text].length;

/** 表格嘅值（未 trim） */
export interface TextDraft {
    name: string;
    shortName: string;
    description: string;
}

export const draftOf = (text: BrandingText | null): TextDraft =>
    text
        ? { name: text.name, shortName: text.shortName ?? '', description: text.description }
        : { ...BUILT_IN_TEXT };

const trimmed = (draft: TextDraft): TextDraft => ({
    name: draft.name.trim(),
    shortName: draft.shortName.trim(),
    description: draft.description.trim(),
});

export const isDirty = (draft: TextDraft, saved: TextDraft) =>
    JSON.stringify(trimmed(draft)) !== JSON.stringify(trimmed(saved));

/** 有改 + App 名同簡介唔係空白先可以儲存 */
export const canSave = (draft: TextDraft, saved: TextDraft) => {
    const { name, description } = trimmed(draft);
    return isDirty(draft, saved) && name !== '' && description !== '';
};

/** App 名有改 → 儲存前要確認（Q3） */
export const nameChanged = (draft: TextDraft, saved: TextDraft) =>
    draft.name.trim() !== saved.name.trim();

/** PUT /api/branding/text：短名留空 = null（用 App 名） */
export const textBody = (draft: TextDraft): BrandingText => {
    const { name, shortName, description } = trimmed(draft);
    return { name, shortName: shortName === '' ? null : shortName, description };
};

/** 主畫面圖示下面顯示嘅名 */
export const homeName = (draft: TextDraft) => draft.shortName.trim() || draft.name.trim();

/** 卡上預覽：自訂 = R2 圖；內建 = admin public / assets 嘅 player icon */
export interface IconPreviewUrls {
    source: string;
    appleTouch: string;
    maskable: string;
    favicon: string;
}

export const iconUrls = (icon: BrandingIcon | null): IconPreviewUrls =>
    icon
        ? {
              source: imageUrl(icon.icon512),
              appleTouch: imageUrl(icon.appleTouch),
              maskable: imageUrl(icon.maskable),
              favicon: imageUrl(icon.favicon),
          }
        : {
              source: '/icon-192.png',
              appleTouch: '/apple-touch-icon.png',
              maskable: maskableDefault,
              favicon: '/favicon.png',
          };

/** 內建圖示嘅底色（apps/player/scripts/generateIcons.mjs ICON_BACKGROUND，maskable / apple-touch 填四角） */
export const BUILT_IN_ICON_BACKGROUND = '#98bdde';

/** 內建原圖（apps/player/assets/app-icon.png 嘅副本，appIcon.node.test 鎖住）：重新裁切內建圖示時用 */
const BUILT_IN_SOURCE_NAME = 'app-icon.png';

/** 重新裁切：去邊度攞原圖（url）、dialog 顯示嘅檔名、dialog 起點 */
export interface IconSourceRequest {
    url: string;
    name: string;
    seed: IconSeed;
}

/**
 * 內建 = repo 原圖（要上載）；有原圖 = R2 原圖 + 上次嘅框；
 * 舊圖示（呢個功能之前上載，冇原圖）= 用已上載嘅 512 圖示頂住（唔使再上載）
 */
export const iconSourceRequest = (
    icon: BrandingIcon | null,
    device: IconDevice,
): IconSourceRequest => {
    if (!icon)
        return {
            url: builtInSource,
            name: BUILT_IN_SOURCE_NAME,
            seed: { device, background: BUILT_IN_ICON_BACKGROUND },
        };
    const background = icon.maskableBackground;
    const { source } = icon;
    if (!source)
        return {
            url: imageUrl(icon.icon512),
            name: icon.icon512,
            seed: { device, storedName: icon.icon512, background, fallback: true },
        };
    return {
        url: imageUrl(source.image),
        name: source.image,
        seed: {
            device,
            storedName: source.image,
            boxes: source.boxes,
            same: source.same,
            background,
        },
    };
};
