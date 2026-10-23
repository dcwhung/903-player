import type { CSSProperties, ReactNode } from 'react';
import { themeVars, type ShowTheme } from '../../config/showThemes';
import { usePageCanvas } from '../../hooks/usePageCanvas';
import { useThemeColorMeta } from '../../hooks/useThemeColorMeta';
import styles from './ThemeScope.module.css';

interface ThemeScopeProps {
    theme: ShowTheme;
    children: ReactNode;
    /** 成頁背景（預設）定係只係一個區塊（例如 mini player） */
    fullPage?: boolean;
    className?: string;
    /**
     * 成頁時 html canvas（home indicator 後面）嘅顏色，CSS 色值；預設 theme.bg。
     * 主頁係漸變，傳漸變底色（例如 var(--home-bg-bottom)）先唔會喺底部見到接縫
     */
    canvas?: string;
}

/** 喺子樹套用節目色調（tokens.css 嘅 [data-theme-scope] 會重新推出語意 token） */
export const ThemeScope = ({
    theme,
    children,
    fullPage = true,
    className = '',
    canvas,
}: ThemeScopeProps) => {
    // 只有成頁先改瀏覽器工具列色：bg 係頁頂色（主頁 HOME_THEME.bg 就係漸變頂色）；
    // 淺色頁頂有狀態列色帶，工具列跟色帶
    const statusBar = fullPage ? theme.statusBar : undefined;
    useThemeColorMeta(fullPage ? (statusBar ?? theme.bg) : undefined);
    usePageCanvas(fullPage ? (canvas ?? theme.bg) : undefined);
    return (
        <div
            className={`${fullPage ? styles.scope : ''} ${className}`}
            data-theme-scope=""
            data-scheme={theme.scheme}
            style={themeVars(theme) as CSSProperties}
        >
            {statusBar && (
                // iOS standalone 狀態列一定係白字：淺色頁喺頂部安全區墊一條深色帶
                <div
                    className={styles.statusBand}
                    data-status-band=""
                    aria-hidden="true"
                    style={{ background: statusBar }}
                />
            )}
            {children}
        </div>
    );
};
