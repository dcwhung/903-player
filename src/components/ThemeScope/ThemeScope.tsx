import type { CSSProperties, ReactNode } from 'react';
import { themeVars, type ShowTheme } from '../../config/showThemes';
import styles from './ThemeScope.module.css';

interface ThemeScopeProps {
    theme: ShowTheme;
    children: ReactNode;
    /** 成頁背景（預設）定係只係一個區塊（例如 mini player） */
    fullPage?: boolean;
    className?: string;
}

/** 喺子樹套用節目色調（tokens.css 嘅 [data-theme-scope] 會重新推出語意 token） */
export const ThemeScope = ({
    theme,
    children,
    fullPage = true,
    className = '',
}: ThemeScopeProps) => (
    <div
        className={`${fullPage ? styles.scope : ''} ${className}`}
        data-theme-scope=""
        style={themeVars(theme) as CSSProperties}
    >
        {children}
    </div>
);
