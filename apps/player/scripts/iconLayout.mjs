// generateIcons.mjs 用嘅 icon 尺寸 / 裁切（純函數，scripts/generateIcons.test.ts 測）

// icon 嘅柔藍底色（要同 app-icon.png 背景一致）：maskable 同 apple-touch-icon 用嚟填透明位
// admin 內建底色（apps/admin/src/features/appearance/brandingModel.ts BUILT_IN_ICON_BACKGROUND）要一致
export const ICON_BACKGROUND = '#98bdde';

/**
 * 最大嘅置中正方形裁切框（原圖像素）：同 admin cropGeometry.centerCrop(source, 512×512) 一樣，
 * 即係 admin「調整 App 圖示」打開內建原圖時嘅預設框，咁原封不動重新上載都會得返同一張圖
 */
export const centerSquareCrop = ({ width, height }) => {
    const side = Math.min(width, height);
    return {
        x: Math.round((width - side) / 2),
        y: Math.round((height - side) / 2),
        width: side,
        height: side,
    };
};
