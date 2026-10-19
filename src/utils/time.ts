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
