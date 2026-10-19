import { t } from '../i18n/t';
import { formatDateLabel } from '../utils/date';
import { formatDuration } from '../utils/time';

/** 「12:40 / 1:58:30」；未知長度就冇 */
export const miniPlayerTimeText = (position: number, duration: number): string | undefined =>
    duration > 0
        ? t('player.progressText', {
              current: formatDuration(position),
              total: formatDuration(duration),
          })
        : undefined;

/** 「今日 19/10（一）· 12:40 / 1:58:30」；最近一日 fallback 就唔加「今日」 */
export const miniPlayerSubtitle = (date: string, today: string, timeText?: string): string => {
    const dateLabel = formatDateLabel(date);
    const label = date === today ? t('miniPlayer.today', { date: dateLabel }) : dateLabel;
    return timeText ? t('miniPlayer.withTime', { label, time: timeText }) : label;
};
