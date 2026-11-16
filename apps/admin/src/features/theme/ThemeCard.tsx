/*
 * 一張配色卡 = 細版 player 頁（頁頭標題、碟、進度條、播放掣、集數列）+ 右上角 AA（全部合格）/ ⚠ N（唔合格對數）
 * Design Origin: mockup: _mockups_/admin-phase4/index.html#d（.tcard / .tphone）
 */
import { checkThemeContrast } from '@903-player/catalog';
import { Play } from 'lucide-react';
import type { ReactNode } from 'react';
import { t } from '../../i18n/t';
import { themeStyle, type EntryTheme } from '../../model/theme';
import { Pill } from '../../ui/Pill';

export interface ThemeCardProps {
    label: string;
    badge?: ReactNode;
    theme: EntryTheme;
    name: string;
    sub: string;
    discUrl: string | undefined;
    pressed: boolean;
    onPick: () => void;
}

function ContrastPill({ theme }: { theme: EntryTheme }) {
    const fails = checkThemeContrast(theme).length;
    if (fails === 0)
        return (
            <Pill tone="ok" title={t('themeEditor.aaTitle')}>
                {t('themeEditor.aa')}
            </Pill>
        );
    return (
        <Pill tone="warn" title={t('themeEditor.failsTitle', { count: fails })}>
            {t('themeEditor.fails', { count: fails })}
        </Pill>
    );
}

function MiniPlayer({
    theme,
    name,
    sub,
    discUrl,
}: Omit<ThemeCardProps, 'label' | 'pressed' | 'onPick'>) {
    return (
        <span className={`tphone${theme.scheme === 'light' ? '' : ' dark'}`} aria-hidden="true">
            <span className="sb" />
            <span className="hd">
                <b>{name}</b>
                <small>{sub}</small>
            </span>
            <span className="pdisc sm">{discUrl && <img src={discUrl} alt="" />}</span>
            <span className="bar" />
            <span className="ctl">
                <span className="play">
                    <Play />
                </span>
            </span>
            <span className="li on">{t('themeEditor.nowPlaying')}</span>
            <span className="li">{t('themeEditor.episode')}</span>
        </span>
    );
}

export function ThemeCard({ label, badge, theme, pressed, onPick, ...player }: ThemeCardProps) {
    return (
        <button
            type="button"
            className="tcard"
            aria-pressed={pressed}
            style={themeStyle(theme)}
            onClick={onPick}
        >
            <span className="lbl">
                <span>
                    {label} {badge}
                </span>
                <ContrastPill theme={theme} />
            </span>
            <MiniPlayer theme={theme} {...player} />
        </button>
    );
}
