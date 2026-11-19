import { MS_PER_SECOND, SECONDS_PER_MINUTE } from '../../../../config/constants';
import { t } from '../../../../i18n/t';
import { formatDuration } from '../../../../utils/time';

/** 60 分鐘 timer 啱啱開始顯示「60:00」（唔係 1:00:00）；長過呢個（例如長集嘅「播完呢集」）先加小時 */
const MAX_MINUTES_ONLY_SECONDS = 60 * SECONDS_PER_MINUTE;

/** 倒數向上取整：剩 0.4 秒仲係「0:01」，去到 0 先係時間到 */
const countdownSeconds = (ms: number): number => Math.max(0, Math.ceil(ms / MS_PER_SECOND));

const pad = (value: number): string => String(value).padStart(2, '0');

/** 剩餘時間：23:14 / 60:00 / 1:58:30 */
export const formatCountdown = (ms: number): string => {
    const seconds = countdownSeconds(ms);
    if (seconds > MAX_MINUTES_ONLY_SECONDS) return formatDuration(seconds);
    return `${Math.floor(seconds / SECONDS_PER_MINUTE)}:${pad(seconds % SECONDS_PER_MINUTE)}`;
};

/** 讀屏版：「23 分 14 秒」 */
export const spokenCountdown = (ms: number): string => {
    const seconds = countdownSeconds(ms);
    return t('sleepTimer.spokenRemaining', {
        minutes: Math.floor(seconds / SECONDS_PER_MINUTE),
        seconds: seconds % SECONDS_PER_MINUTE,
    });
};
