import type { CSSProperties } from 'react';
import { HOME_THEME } from '../../../../config/showThemes';

/**
 * 9c 夜間顏色跟 app 主色（HOME_THEME，用戶 2026-11-20 第 3 輪）：經 CSS 變數傳畀 Ambient.module.css
 * .nightPalette，喺嗰度用 --ambient-night-*-mix（tokens.css）同黑色 color-mix 壓暗。
 * 色值只喺 HOME_THEME 一處（唔喺 CSS 再寫一次 hex）
 */
export const NIGHT_PALETTE_STYLE = {
    '--ambient-home-bg': HOME_THEME.bg,
    '--ambient-home-text': HOME_THEME.text,
    '--ambient-home-accent': HOME_THEME.accent,
    '--ambient-home-muted': HOME_THEME.muted,
} as CSSProperties;
