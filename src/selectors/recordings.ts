import type { Recording, ShowId } from '../types/recording';

const byBroadcastTime = (a: Recording, b: Recording): number =>
    `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`);

/** 某節目嘅錄音，由舊到新 */
export const recordingsForShow = (recordings: Recording[], showId: ShowId): Recording[] =>
    recordings.filter((r) => r.showId === showId).sort(byBroadcastTime);

/** 今日有就揀今日，否則揀今日之前最近一集；全部都喺今日之後就揀最舊嗰集 */
export const pickInitialRecording = (
    sortedRecordings: Recording[],
    today: string,
): Recording | undefined =>
    sortedRecordings.findLast((r) => r.date <= today) ?? sortedRecordings[0];

/** 今日有錄音就用今日，否則用今日之前最近一個有錄音嘅日子 */
export const pickTodayDate = (recordings: Recording[], today: string): string | undefined => {
    const dates = [...new Set(recordings.map((r) => r.date))].sort();
    return dates.findLast((date) => date <= today) ?? dates[0];
};

/** 某日嘅錄音，按播出時間排 */
export const showsOnDate = (recordings: Recording[], date: string): Recording[] =>
    recordings.filter((r) => r.date === date).sort(byBroadcastTime);
