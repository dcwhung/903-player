import type { Ref } from 'react';
import { t } from '../../../../i18n/t';
import { MoonIcon } from '../../common/icons/icons';
import styles from './SleepTimer.module.css';
import { formatCountdown, spokenCountdown } from './sleepTimerFormat';

const MOON_ICON_SIZE = 20;

/**
 * 月亮掣擺喺邊：header = 內頁頁頭右邊空格；beside = 頁頭右邊已經有嘢（HomeView 清單掣 / 手機打橫指示點），
 * 擺喺佢左邊；card = 闊版主頁播放卡指示點嗰行右邊；mini = mini player 播放掣左邊
 */
export type SleepTimerPlacement = 'header' | 'beside' | 'card' | 'mini';

interface SleepTimerButtonProps {
    placement: SleepTimerPlacement;
    active: boolean;
    /** 剩餘 ms（active 先用） */
    remaining: number;
    /** 選單開緊 */
    expanded: boolean;
    onOpen: () => void;
    ref?: Ref<HTMLButtonElement>;
}

/**
 * 月亮掣（9d）：未開 = 線條月亮；開咗 = 實色月亮 + 剩餘分秒（冇底色，當頁主題強調色）。
 * 畫面嘅分秒讀屏唔讀，掣名已經講埋「剩餘 23 分 14 秒」
 */
export const SleepTimerButton = ({
    placement,
    active,
    remaining,
    expanded,
    onOpen,
    ref,
}: SleepTimerButtonProps) => (
    <button
        ref={ref}
        type="button"
        className={styles.button}
        data-placement={placement}
        data-active={String(active)}
        aria-label={
            active
                ? t('sleepTimer.buttonActive', { remaining: spokenCountdown(remaining) })
                : t('sleepTimer.button')
        }
        aria-haspopup="dialog"
        aria-expanded={expanded}
        onClick={onOpen}
    >
        <MoonIcon size={MOON_ICON_SIZE} filled={active} />
        {active && (
            <span className={styles.time} aria-hidden="true">
                {formatCountdown(remaining)}
            </span>
        )}
    </button>
);
