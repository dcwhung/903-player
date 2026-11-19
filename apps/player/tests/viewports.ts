import type { ViewportSize } from './mediaQuery';

/**
 * 唔係 HomeView（正方形）嘅 viewport：手機、平板、桌面、iPhone Duo 四個形態。
 * 用嚟驗「只有 HomeView 先有」嘅行為（例如集數 sheet 頂嘅 banner），配 stubViewport + it.each
 */
export const NON_SQUARE_VIEWPORTS: ReadonlyArray<[string, ViewportSize]> = [
    ['phone portrait', { width: 390, height: 844 }],
    ['phone landscape', { width: 844, height: 390 }],
    ['tablet', { width: 820, height: 1180 }],
    ['desktop', { width: 1280, height: 800 }],
    ['Duo cover portrait', { width: 426, height: 612 }],
    ['Duo open portrait', { width: 612, height: 876 }],
    ['Duo cover landscape', { width: 612, height: 426 }],
    ['Duo open landscape', { width: 876, height: 612 }],
];
