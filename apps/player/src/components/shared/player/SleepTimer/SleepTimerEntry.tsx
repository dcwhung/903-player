import { useContext, useState } from 'react';
import { createPortal } from 'react-dom';
import { SleepTimerContext } from '../../../../player/sleepTimerContext';
import { useNightWindow } from '../../../../player/useNightWindow';
import { useSleepTimer } from '../../../../player/useSleepTimer';
import { SleepTimerBar } from './SleepTimerBar';
import { SleepTimerButton, type SleepTimerPlacement } from './SleepTimerButton';
import { SleepTimerSheet } from './SleepTimerSheet';
import { sleepTimerView } from './sleepTimerView';

export type { SleepTimerPlacement } from './SleepTimerButton';

const THEME_SCOPE = '[data-theme-scope]';

/** 最外嗰層 ThemeScope（成頁）：闊版主頁播放卡自己有一層，頁頂進度條要掛喺主頁嗰層 */
const outermostScope = (el: Element): HTMLElement | null => {
    let found: HTMLElement | null = null;
    for (let scope = el.closest<HTMLElement>(THEME_SCOPE); scope;) {
        found = scope;
        scope = scope.parentElement?.closest<HTMLElement>(THEME_SCOPE) ?? null;
    }
    return found;
};

/**
 * 頁頂進度條掛喺邊（portal）：成頁 ThemeScope（跟當頁主題強調色；.scope 係 size container，
 * position: fixed 對住成頁）。頁頭有時喺橫版欄入面（欄都係 size container），唔可以就地 fixed。
 * mini player 自己畫卡頂條，唔掛頁頂
 */
const pageBarHost = (placement: SleepTimerPlacement, button: HTMLElement | null) => {
    if (!button || placement === 'mini') return null;
    return placement === 'card' ? outermostScope(button) : button.closest<HTMLElement>(THEME_SCOPE);
};

interface SleepTimerEntryProps {
    placement: SleepTimerPlacement;
}

/** 月亮掣 + 選單 + 進度條（9d）。冇 PlayerProvider（例如單獨 render 嘅 component test）就乜都唔出 */
export const SleepTimerEntry = ({ placement }: SleepTimerEntryProps) =>
    useContext(SleepTimerContext) ? <Entry placement={placement} /> : null;

const Entry = ({ placement }: SleepTimerEntryProps) => {
    const night = useNightWindow();
    const { timer, now, remainingMs, fraction } = useSleepTimer();
    const remaining = remainingMs(now);
    const { visible, active } = sleepTimerView({ night, hasTimer: timer !== null, remaining });
    // 掣嘅 DOM（state，唔係 ref：render 時要搵佢嘅 ThemeScope）同選單開關
    const [button, setButton] = useState<HTMLButtonElement | null>(null);
    const [open, setOpen] = useState(false);
    // 日間冇 timer：完全唔 render，現有畫面零改變
    if (!visible) return null;
    const barHost = active ? pageBarHost(placement, button) : null;
    // 選單掛喺掣所在嘅 ThemeScope（跟當頁 / 節目色）；mini player 卡有 transform，唔可以掛喺卡入面
    const sheetHost = button ? (button.closest<HTMLElement>(THEME_SCOPE) ?? document.body) : null;
    return (
        <>
            <SleepTimerButton
                ref={setButton}
                placement={placement}
                active={active}
                remaining={remaining}
                expanded={open}
                onOpen={() => setOpen(true)}
            />
            {active && placement === 'mini' && (
                <SleepTimerBar kind="card" fraction={fraction(now)} />
            )}
            {barHost &&
                createPortal(<SleepTimerBar kind="page" fraction={fraction(now)} />, barHost)}
            {sheetHost &&
                createPortal(
                    <SleepTimerSheet
                        open={open}
                        onClose={() => setOpen(false)}
                        side={placement === 'card'}
                    />,
                    sheetHost,
                )}
        </>
    );
};
