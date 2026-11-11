/*
 * 圖片 slot 標準尺寸（碟面 600×600、Banner 1216×684，同 apps/api ASSET_DIMENSIONS）；
 * 上載前處理（類型、decode、置中裁切、轉 WebP）見 imageCrop.ts
 */
export type ImageSlotKind = 'disc' | 'tile';

export interface Size {
    width: number;
    height: number;
}

export const SLOT_SIZES: Record<ImageSlotKind, Size> = {
    disc: { width: 600, height: 600 },
    tile: { width: 1216, height: 684 },
};

export const sizeLabel = ({ width, height }: Size) => `${width}×${height}`;
