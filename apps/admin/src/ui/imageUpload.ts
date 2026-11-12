/*
 * 圖片 slot 標準尺寸（碟面 600×600、Banner 1216×684）：數字喺 @903-player/catalog ASSET_DIMENSIONS（S-805，
 * 同 apps/api 上載白名單同一份）；上載前處理（類型、decode、置中裁切、轉 WebP）見 imageCrop.ts
 */
import { ASSET_DIMENSIONS, type AssetSize } from '@903-player/catalog';

export type ImageSlotKind = 'disc' | 'tile';

export type Size = AssetSize;

export const SLOT_SIZES: Readonly<Record<ImageSlotKind, Size>> = {
    disc: ASSET_DIMENSIONS.disc,
    tile: ASSET_DIMENSIONS.tile,
};

export const sizeLabel = ({ width, height }: Size) => `${width}×${height}`;
