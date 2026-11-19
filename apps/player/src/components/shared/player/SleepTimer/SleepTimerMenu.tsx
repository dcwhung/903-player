import { SLEEP_TIMER_MINUTES } from '../../../../config/constants';
import { t } from '../../../../i18n/t';
import { formatScheduleTime } from '../../../../player/sleepTimerSchedule';
import { useSleepTimer } from '../../../../player/useSleepTimer';
import { useSleepTimerSchedule } from '../../../../player/useSleepTimerSchedule';
import { MoonIcon } from '../../common/icons/icons';
import styles from './SleepTimerSheet.module.css';
import { formatCountdown } from './sleepTimerFormat';
import { EpisodeButton, MinuteButton, OptionButton, type ChoiceState } from './SleepTimerOptions';

const TITLE_ICON_SIZE = 22;

/** 表頭右上：開緊 =「剩餘 23:14」；有每晚排程未開 =「22:30 開始」（淡啲）；都冇就唔出 */
const MenuStatus = ({
    remaining,
    scheduledAt,
}: {
    remaining: number | null;
    scheduledAt: number | null;
}) => {
    if (remaining !== null) {
        return (
            <span className={styles.status} data-kind="remaining" data-testid="sleep-timer-status">
                {t('sleepTimer.remaining', { time: formatCountdown(remaining) })}
            </span>
        );
    }
    if (scheduledAt === null) return null;
    return (
        <span className={styles.status} data-kind="scheduled" data-testid="sleep-timer-status">
            {t('sleepTimer.scheduledAt', { time: formatScheduleTime(scheduledAt) })}
        </span>
    );
};

interface SleepTimerMenuProps {
    titleId: string;
    /** 揀咗 / 停用咗：閂選單 */
    onDone: () => void;
}

/** 開住每秒更新（tickWhileIdle）：剩餘時間、「播完呢集」跟播放位置 */
const useMenuState = (onDone: () => void) => {
    const { timer, now, remainingMs, episodeRemainingMs, cancel } = useSleepTimer({
        tickWhileIdle: true,
    });
    const { schedule, pick, clear } = useSleepTimerSchedule();
    const remaining = remainingMs(now);
    // 剩 0 當未開（同月亮掣一樣，sleepTimerView）
    const running = timer !== null && remaining > 0 ? timer.option : null;
    const state: ChoiceState = {
        running,
        scheduled: running === null ? (schedule?.option ?? null) : null,
        pick: (option) => {
            if (pick(option)) onDone();
        },
    };
    /** 開緊 = 只停今晚（排程保留）；未開 = 取消每晚排程 */
    const stop = () => {
        if (running !== null) cancel();
        else clear();
        onDone();
    };
    return {
        state,
        stop,
        remaining: running === null ? null : remaining,
        scheduledAt: schedule?.minuteOfDay ?? null,
        episodeLeft: episodeRemainingMs(),
    };
};

/**
 * 選單內容（用戶 2026-11-19 D 款）：月亮 +「休眠」，右上剩餘 / 排程時間；「幾多分鐘後」+ 15 / 30 / 60，
 * 下面「播完呢集」｜「停用」。手動揀 = 即開始 + 記低做每晚排程（SleepTimerScheduler）
 */
export const SleepTimerMenu = ({ titleId, onDone }: SleepTimerMenuProps) => {
    const { state, stop, remaining, scheduledAt, episodeLeft } = useMenuState(onDone);
    return (
        <>
            <header className={styles.header}>
                <span className={styles.titleIcon} aria-hidden="true">
                    <MoonIcon size={TITLE_ICON_SIZE} filled />
                </span>
                <h2 id={titleId} className={styles.title}>
                    {t('sleepTimer.title')}
                </h2>
                <MenuStatus remaining={remaining} scheduledAt={scheduledAt} />
            </header>
            <div className={styles.options} data-testid="sleep-timer-options">
                <span className={styles.caption} aria-hidden="true">
                    {t('sleepTimer.minutesCaption')}
                </span>
                {SLEEP_TIMER_MINUTES.map((minutes) => (
                    <MinuteButton key={minutes} minutes={minutes} state={state} />
                ))}
                <EpisodeButton left={episodeLeft} state={state} />
                <OptionButton kind="wide" selected={state.running === null} onPress={stop}>
                    <span className={styles.optionLabel}>{t('sleepTimer.stop')}</span>
                </OptionButton>
            </div>
        </>
    );
};
