import { t } from '../../../../i18n/t';
import { useMinuteClock } from '../../../../hooks/useMinuteClock';
import { useSleepTimer } from '../../../../player/useSleepTimer';
import type { AmbientView as AmbientData } from '../../../../selectors/ambient';
import { formatClock, formatClockDate } from '../../../../utils/clock';
import { PauseIcon, PlayIcon, MoonIcon } from '../../common/icons/icons';
import { Marquee } from '../../common/Marquee/Marquee';
import { VisuallyHidden } from '../../common/VisuallyHidden/VisuallyHidden';
import { SleepTimerBar } from '../SleepTimer/SleepTimerBar';
import { formatCountdown, spokenCountdown } from '../SleepTimer/sleepTimerFormat';
import { sleepTimerView } from '../SleepTimer/sleepTimerView';
import styles from './Ambient.module.css';
import { AmbientDisc } from './AmbientDisc';

/** icon 大細跟 token（cqw，跟閒置畫面闊度）；StrokeIcon 用 inline style 定大細，所以經 style 傳 */
const STATUS_ICON = { width: 'var(--ambient-status-icon)', height: 'var(--ambient-status-icon)' };
const TIMER_ICON = { width: 'var(--ambient-timer-icon)', height: 'var(--ambient-timer-icon)' };

/** 睡眠 timer 開緊（9d）：頂邊全闊細條 + 右上實色月亮同剩餘分秒；淨係顯示，唔係掣 */
const AmbientSleepTimer = () => {
    const { timer, now, remainingMs, fraction } = useSleepTimer();
    const remaining = remainingMs(now);
    // night 唔關事：閒置畫面淨係開緊先出（日間冇 timer 就乜都冇）
    const { active } = sleepTimerView({ night: false, hasTimer: timer !== null, remaining });
    if (!active) return null;
    return (
        <>
            <SleepTimerBar kind="page" fraction={fraction(now)} />
            <p className={styles.timer} data-ambient-timer="">
                <MoonIcon filled style={TIMER_ICON} />
                <span aria-hidden="true">{formatCountdown(remaining)}</span>
                <VisuallyHidden>
                    {t('sleepTimer.buttonActive', { remaining: spokenCountdown(remaining) })}
                </VisuallyHidden>
            </p>
        </>
    );
};

const statusLine = (view: AmbientData): string =>
    view.status === 'paused'
        ? t('ambient.paused', {
              status: t('common.status.paused'),
              sep: t('common.separator'),
              subtitle: view.subtitle,
          })
        : view.subtitle;

interface AmbientViewProps {
    view: AmbientData;
    /** 真正出緊聲（usePlayer().isAudible）：唱片先轉 */
    isAudible: boolean;
}

/**
 * 閒置畫面 B 款（_mockups_/home-view-ambient 第 3 輪）：左唱片 + 進度圈；右時間（Poppins 600、24 小時）、
 * 日子、節目名（強調色）、播放 / 暫停 icon + 副題。成組左右置中（用戶 2026-11-20）
 */
export const AmbientView = ({ view, isAudible }: AmbientViewProps) => {
    const now = useMinuteClock();
    const paused = view.status === 'paused';
    const StatusIcon = paused ? PauseIcon : PlayIcon;
    return (
        <div className={styles.layout} data-ambient-status={view.status}>
            <AmbientSleepTimer />
            <AmbientDisc
                art={view.art}
                progress={view.progress}
                spinning={isAudible && !paused && !view.live}
                upright={view.live}
            />
            <div className={styles.side}>
                <p className={styles.clock}>{formatClock(now)}</p>
                <p className={styles.date}>{formatClockDate(now)}</p>
                {/* 節目名 / 副題唔換行、唔撐闊右格（闊度 = 時間）：放唔落就跑馬燈（同 mini player） */}
                <Marquee className={styles.name} text={view.name} />
                <p className={styles.status}>
                    <StatusIcon style={STATUS_ICON} />
                    <Marquee className={styles.statusText} text={statusLine(view)} />
                </p>
            </div>
        </div>
    );
};
