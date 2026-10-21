const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_HOUR = 3600;

const pad = (value: number): string => String(value).padStart(2, '0');

/** 1:53:56 / 48:12 / 0:09 */
export const formatDuration = (totalSeconds: number): string => {
    const safe = Number.isFinite(totalSeconds) && totalSeconds > 0 ? Math.floor(totalSeconds) : 0;
    const hours = Math.floor(safe / SECONDS_PER_HOUR);
    const minutes = Math.floor((safe % SECONDS_PER_HOUR) / SECONDS_PER_MINUTE);
    const seconds = safe % SECONDS_PER_MINUTE;
    return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
};

/** 讀到時長未：metadata 未到（例如斷網）係 0；串流 Infinity 都當讀到 */
export const hasKnownDuration = (duration: number): boolean => duration > 0;

const BROADCAST_HOUR_DIGITS = 2;

/** 播出時間：0708 → 07:08 */
export const formatBroadcastTime = (hhmm: string): string =>
    `${hhmm.slice(0, BROADCAST_HOUR_DIGITS)}:${hhmm.slice(BROADCAST_HOUR_DIGITS)}`;
