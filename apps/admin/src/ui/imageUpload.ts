/*
 * 圖片 slot 標準尺寸：數字喺 @903-player/catalog ASSET_DIMENSIONS（S-805，同 apps/api 上載白名單同一份）；
 * 碟面 600×600、Banner（tile）1216×684、首頁 Banner 窄版 1200×517 / 闊版 2000×400。
 * 原圖上限（S-816）：檔案 20 MB（= api R2_SOURCE_MAX_BYTES）、邊長 8000 px；輸出上限 ASSET_MAX_BYTES。
 * 上載前處理（類型、decode、裁切、轉 WebP）見 imageCrop.ts
 */
import { ASSET_DIMENSIONS, type AssetSize, type AssetSlot } from '@903-player/catalog';

/** entry（節目 / 劇集 / 短篇）嘅圖：definition 入面嘅 key */
export type ImageSlotKind = 'disc' | 'tile';

/** 裁切編輯器識嘅全部 slot（entry 兩款 + 首頁 Banner 兩款） */
export type CropSlot = AssetSlot;

export type Size = AssetSize;

export const SLOT_SIZES: Readonly<Record<CropSlot, Size>> = ASSET_DIMENSIONS;

const BYTES_PER_KB = 1024;
const BYTES_PER_MB = BYTES_PER_KB * BYTES_PER_KB;
/** 原圖檔案上限（MB）：同 apps/api R2_SOURCE_MAX_BYTES 一樣，本機檔同 R2 原圖都用 */
export const SOURCE_MAX_MB = 20;
export const SOURCE_MAX_BYTES = SOURCE_MAX_MB * BYTES_PER_MB;
/** 原圖最長邊（px）：再大 decode 會食好多記憶體（手機 Safari 會直接 crash） */
export const SOURCE_MAX_EDGE_PX = 8000;

export const sizeLabel = ({ width, height }: Size) => `${width} × ${height}`;

/** bytes → 「2.4」MB（一個小數位） */
export const megabytes = (bytes: number) => (bytes / BYTES_PER_MB).toFixed(1);

/** bytes → KB（最少 1） */
export const kilobytes = (bytes: number) => Math.max(1, Math.round(bytes / BYTES_PER_KB));
