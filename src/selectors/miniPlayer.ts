import { t } from '../i18n/t';
import type { Recording } from '../types/recording';
import { asShowRecording, type Track } from '../types/track';
import { formatDateLabel } from '../utils/date';
import { formatDuration } from '../utils/time';

/** 節目名旁邊嘅細標籤：rewatch = 聽緊嘅舊集（「重溫」），today = 今日節目（「今日」） */
export type MiniPlayerTag = 'rewatch' | 'today';

/** 「12:40 / 1:58:30」；未知長度就冇 */
export const miniPlayerTimeText = (position: number, duration: number): string | undefined =>
    duration > 0
        ? t('player.progressText', {
              current: formatDuration(position),
              total: formatDuration(duration),
          })
        : undefined;

/** 「19/10（一）· 12:40 / 1:58:30」：只有日子（今日 / 重溫交畀節目名旁邊個標籤講） */
export const miniPlayerSubtitle = (date: string, timeText?: string): string => {
    const label = formatDateLabel(date);
    return timeText ? t('miniPlayer.withTime', { label, time: timeText }) : label;
};

/**
 * mini player 清單：player 載入緊一集清單冇嘅節目錄音（例如節目頁日子條揀嘅舊集）就排最前，
 * 返主頁照樣見到、照樣播；轉咗載入第二集就自然跌返出清單。廣播劇另外顯示，唔郁清單
 */
export const miniPlayerRecordings = (listed: Recording[], loaded: Track | null): Recording[] => {
    const show = asShowRecording(loaded);
    return show && !listed.some((r) => r.url === show.url) ? [show, ...listed] : listed;
};

/**
 * 每段錄音嘅標籤：排最前嘅舊集係「重溫」，日子係今日就「今日」。
 * 清單除咗重溫都係今日節目；日子唔係今日就唔標（防守用，正常唔會發生）
 */
export const miniPlayerTags = (
    list: Recording[],
    hasRewatch: boolean,
    today: string,
): (MiniPlayerTag | undefined)[] =>
    list.map((r, i) => {
        if (hasRewatch && i === 0) return 'rewatch';
        return r.date === today ? 'today' : undefined;
    });
