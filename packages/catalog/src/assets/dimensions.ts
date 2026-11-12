/*
 * 圖片 slot 標準尺寸 + 上載大小上限（S-805）：api（上載白名單）同 admin（裁切 / 上載前檢查）共用，
 * 唔好兩邊各自抄一份數字
 */

export interface AssetSize {
    readonly width: number;
    readonly height: number;
}

export type AssetSlot = 'disc' | 'tile' | 'bannerStandard' | 'bannerLong';

/** disc：正方形 */
const DISC_SIZE_PX = 600;
/** tile：16:9（節目同劇集統一；劇集卡照舊 2:1 cover 裁） */
const TILE_WIDTH_PX = 1216;
const TILE_HEIGHT_PX = 684;
/** 首頁 banner 窄版（banner.webp）：鎖住現有尺寸（Phase 4 plan） */
const BANNER_STANDARD_WIDTH_PX = 1200;
const BANNER_STANDARD_HEIGHT_PX = 517;
/** 首頁 banner 闊版（banner-wide.webp） */
const BANNER_LONG_WIDTH_PX = 2000;
const BANNER_LONG_HEIGHT_PX = 400;

const sizeOf = (width: number, height: number): AssetSize => Object.freeze({ width, height });

/** 每個 slot 嘅標準尺寸（disc / tile：用戶 2026-11-10 決定；banner：Phase 4 plan） */
export const ASSET_DIMENSIONS: Readonly<Record<AssetSlot, AssetSize>> = Object.freeze({
    disc: sizeOf(DISC_SIZE_PX, DISC_SIZE_PX),
    tile: sizeOf(TILE_WIDTH_PX, TILE_HEIGHT_PX),
    bannerStandard: sizeOf(BANNER_STANDARD_WIDTH_PX, BANNER_STANDARD_HEIGHT_PX),
    bannerLong: sizeOf(BANNER_LONG_WIDTH_PX, BANNER_LONG_HEIGHT_PX),
});

const KIB = 1024;
/** 1 MB：現有最大嘅圖遠細過呢個數 */
export const ASSET_MAX_BYTES = KIB * KIB;
