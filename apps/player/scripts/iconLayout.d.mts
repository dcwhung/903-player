/*
 * iconLayout.mjs 嘅型別（只畀 repo 入面嘅 TypeScript test 用）。
 */
export const ICON_BACKGROUND: string;

export interface IconSize {
    width: number;
    height: number;
}

export interface IconCrop extends IconSize {
    x: number;
    y: number;
}

export function centerSquareCrop(source: IconSize): IconCrop;
