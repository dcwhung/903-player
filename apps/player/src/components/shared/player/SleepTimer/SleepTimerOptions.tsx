import type { ReactNode } from 'react';
import { t } from '../../../../i18n/t';
import type { SleepTimerMinutes, SleepTimerOption } from '../../../../player/sleepTimer';
import styles from './SleepTimerSheet.module.css';
import { formatCountdown } from './sleepTimerFormat';

/*
 * 選單掣（用戶 2026-11-19 D 款）：未揀中淡白字灰框；揀中（aria-pressed）奶黃實線框 + 粗字；
 * 每晚排程（data-scheduled）奶黃虛線框。樣式見 SleepTimerSheet.module.css
 */

interface OptionButtonProps {
    /** number = 15 / 30 / 60（一行三粒）；wide = 播完呢集 / 停用（一行兩粒） */
    kind: 'number' | 'wide';
    /** 揀中：開緊嘅選項；未開 =「停用」（實線框 + 粗字） */
    selected: boolean;
    /** 未開時嘅每晚排程（虛線框） */
    scheduled?: boolean;
    /** 灰咗撳唔到（直播 / 未知長度嘅「播完呢集」）；唔用 disabled：照 focus 到，讀屏知道有呢個選項 */
    unavailable?: boolean;
    label?: string;
    onPress: () => void;
    children: ReactNode;
}

export const OptionButton = ({
    kind,
    selected,
    scheduled = false,
    unavailable = false,
    label,
    onPress,
    children,
}: OptionButtonProps) => (
    <button
        type="button"
        className={styles.option}
        data-kind={kind}
        aria-label={label}
        aria-pressed={selected}
        data-scheduled={String(scheduled)}
        aria-disabled={unavailable || undefined}
        onClick={() => {
            if (!unavailable) onPress();
        }}
    >
        {children}
    </button>
);

export interface ChoiceState {
    /** 開緊嘅選項；null = 未開 */
    running: SleepTimerOption | null;
    /** 每晚排程嘅選項（只喺未開時標出嚟） */
    scheduled: SleepTimerOption | null;
    pick: (option: SleepTimerOption) => void;
}

export const MinuteButton = ({
    minutes,
    state,
}: {
    minutes: SleepTimerMinutes;
    state: ChoiceState;
}) => (
    <OptionButton
        kind="number"
        label={t('sleepTimer.minutes', { minutes })}
        selected={state.running === minutes}
        scheduled={state.scheduled === minutes}
        onPress={() => state.pick(minutes)}
    >
        <span className={styles.optionLabel}>{minutes}</span>
    </OptionButton>
);

/** 「播完呢集」：細字「剩餘時間：9:59」（排程嗰粒唔出）；直播 / 未知長度變灰 */
export const EpisodeButton = ({
    left,
    state,
}: {
    left: number | undefined;
    state: ChoiceState;
}) => {
    const scheduled = state.scheduled === 'episode';
    return (
        <OptionButton
            kind="wide"
            selected={state.running === 'episode'}
            scheduled={scheduled}
            unavailable={left === undefined}
            onPress={() => state.pick('episode')}
        >
            <span className={styles.optionLabel}>{t('sleepTimer.episode')}</span>
            {left !== undefined && !scheduled && (
                <>
                    {' '}
                    <span className={styles.optionDetail}>
                        {t('sleepTimer.episodeRemaining', { time: formatCountdown(left) })}
                    </span>
                </>
            )}
        </OptionButton>
    );
};
