import { SLEEP_TIMER_MINUTES } from '../../../../config/constants';
import { t } from '../../../../i18n/t';
import type { SleepTimerOption } from '../../../../player/sleepTimer';
import { useSleepTimer } from '../../../../player/useSleepTimer';
import { MoonIcon } from '../../common/icons/icons';
import styles from './SleepTimerSheet.module.css';
import { formatCountdown } from './sleepTimerFormat';

const TITLE_ICON_SIZE = 22;

const OPTIONS: readonly SleepTimerOption[] = [...SLEEP_TIMER_MINUTES, 'episode'];

const optionLabel = (option: SleepTimerOption): string =>
    option === 'episode' ? t('sleepTimer.episode') : t('sleepTimer.minutes', { minutes: option });

interface OptionButtonProps {
    option: SleepTimerOption;
    /** 開緊嘅就係呢粒：實色 */
    running: boolean;
    /** 未開時上次揀嗰粒：強調色框線 */
    last: boolean;
    /** 「播完呢集」：呢集剩餘時間；undefined = 直播 / 未載到（變灰） */
    episodeLeft: number | undefined;
    onPick: (option: SleepTimerOption) => void;
}

const OptionButton = ({ option, running, last, episodeLeft, onPick }: OptionButtonProps) => {
    const isEpisode = option === 'episode';
    const unavailable = isEpisode && episodeLeft === undefined;
    return (
        <button
            type="button"
            className={styles.option}
            aria-pressed={running}
            data-last={String(last)}
            // 唔用 disabled：灰咗都撳唔到但照 focus 到，讀屏知道有呢個選項
            aria-disabled={unavailable || undefined}
            onClick={() => {
                if (!unavailable) onPick(option);
            }}
        >
            <span className={styles.optionLabel}>{optionLabel(option)}</span>
            {isEpisode && episodeLeft !== undefined && (
                <>
                    {' '}
                    <span className={styles.optionDetail}>
                        {t('sleepTimer.episodeRemaining', { time: formatCountdown(episodeLeft) })}
                    </span>
                </>
            )}
        </button>
    );
};

/**
 * 開緊時標題右邊嘅 tab 掣「剩餘 23:14｜關閉」：主頁「節目｜廣播劇」款（HomeTabs）——
 * 膠囊軌道，揀中格（剩餘）強調色膠囊墊底；撳「關閉」= 取消 timer
 */
const StatusTabs = ({ remaining, onOff }: { remaining: number; onOff: () => void }) => (
    <div className={styles.tabs} role="group" aria-label={t('sleepTimer.status')}>
        <button type="button" className={styles.tab} aria-pressed="true">
            {t('sleepTimer.remaining', { time: formatCountdown(remaining) })}
        </button>
        <button type="button" className={styles.tab} aria-pressed="false" onClick={onOff}>
            {t('sleepTimer.off')}
        </button>
    </div>
);

interface SleepTimerMenuProps {
    titleId: string;
    /** 揀咗 / 關閉咗：閂選單 */
    onDone: () => void;
}

/**
 * 選單內容（_mockups_/sleep-timer）：標題 + 月亮（開緊時右邊 tab 掣）+ 2×2 大掣；冇說明字。
 * 開住每秒更新（tickWhileIdle）：「播完呢集」嘅剩餘時間跟播放位置
 */
export const SleepTimerMenu = ({ titleId, onDone }: SleepTimerMenuProps) => {
    const { timer, lastOption, now, remainingMs, episodeRemainingMs, start, cancel } =
        useSleepTimer({ tickWhileIdle: true });
    const remaining = remainingMs(now);
    // 剩 0 當未開（同月亮掣一樣，sleepTimerView）
    const running = timer !== null && remaining > 0 ? timer.option : null;
    const episodeLeft = episodeRemainingMs();
    const pick = (option: SleepTimerOption) => {
        if (start(option)) onDone();
    };
    return (
        <>
            <header className={styles.header}>
                <span className={styles.titleIcon} aria-hidden="true">
                    <MoonIcon size={TITLE_ICON_SIZE} filled />
                </span>
                <h2 id={titleId} className={styles.title}>
                    {t('sleepTimer.title')}
                </h2>
                {running !== null && (
                    <StatusTabs
                        remaining={remaining}
                        onOff={() => {
                            cancel();
                            onDone();
                        }}
                    />
                )}
            </header>
            <div className={styles.options} data-testid="sleep-timer-options">
                {OPTIONS.map((option) => (
                    <OptionButton
                        key={option}
                        option={option}
                        running={running === option}
                        last={running === null && lastOption === option}
                        episodeLeft={episodeLeft}
                        onPick={pick}
                    />
                ))}
            </div>
        </>
    );
};
