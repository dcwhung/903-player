import { SHOWS, type ShowConfig } from '../config/shows';
import type { EpisodeEntry, Recording, ShowId, UnavailableEpisode } from '../types/recording';
import { weekdayOf } from '../utils/date';

type Broadcast = Pick<Recording, 'date' | 'time'>;

const byBroadcastTime = (a: Broadcast, b: Broadcast): number =>
    `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`);

const episodeKey = (episode: Pick<Recording, 'showId' | 'date'>): string =>
    `${episode.showId}/${episode.date}`;

/** 未上架集數入面，仲未搵到錄音嘅（probe 搵到之後即刻唔再當未上架） */
const stillUnavailable = (
    unavailable: UnavailableEpisode[],
    recordings: Recording[],
): UnavailableEpisode[] => {
    const found = new Set(recordings.map(episodeKey));
    return unavailable.filter((u) => !found.has(episodeKey(u)));
};

/** 某節目嘅錄音，由舊到新 */
export const recordingsForShow = (recordings: Recording[], showId: ShowId): Recording[] =>
    recordings.filter((r) => r.showId === showId).sort(byBroadcastTime);

/** 今日有就揀今日，否則揀今日之前最近一集；全部都喺今日之後就揀最舊嗰集 */
export const pickInitialRecording = (
    sortedRecordings: Recording[],
    today: string,
): Recording | undefined =>
    sortedRecordings.findLast((r) => r.date <= today) ?? sortedRecordings[0];

/** 嗰日（香港星期幾）有排節目播嘅節目 */
const showsAiringOn = (date: string): ShowConfig[] =>
    SHOWS.filter((show) => show.airDays.includes(weekdayOf(date)));

const hasShowsOn = (date: string): boolean => showsAiringOn(date).length > 0;

/**
 * 今日有排節目播就一定用今日（就算一個都未開始 / 未上架），唔會跳去舊日子；
 * 今日冇節目播（例如星期日）先用今日之前最近一個有錄音嘅日子
 */
export const pickTodayDate = (recordings: Recording[], today: string): string | undefined => {
    if (hasShowsOn(today)) {
        return today;
    }
    const dates = [...new Set(recordings.map((r) => r.date))].sort();
    return dates.findLast((date) => date <= today) ?? dates[0];
};

/** 某日嘅錄音，按播出時間排 */
export const showsOnDate = (recordings: Recording[], date: string): Recording[] =>
    recordings.filter((r) => r.date === date).sort(byBroadcastTime);

/** 今日節目頁用嘅日子嘅錄音，按播出時間排；今日有節目播但未上架就冇（唔會跳去舊日子） */
export const todayRecordings = (recordings: Recording[], today: string): Recording[] => {
    const date = pickTodayDate(recordings, today);
    return date ? showsOnDate(recordings, date) : [];
};

/** 某節目仲未上架嘅集數 */
export const unavailableForShow = (
    unavailable: UnavailableEpisode[],
    recordings: Recording[],
    showId: ShowId,
): UnavailableEpisode[] =>
    stillUnavailable(unavailable, recordings).filter((u) => u.showId === showId);

/** 某日仲未上架嘅集數，按播出時間排 */
export const unavailableOnDate = (
    unavailable: UnavailableEpisode[],
    recordings: Recording[],
    date: string,
): UnavailableEpisode[] =>
    stillUnavailable(unavailable, recordings)
        .filter((u) => u.date === date)
        .sort(byBroadcastTime);

/** 集數清單：最新喺頂 */
export const episodesNewestFirst = (recordings: Recording[], showId: ShowId): Recording[] =>
    recordingsForShow(recordings, showId).reverse();

/** 清單一行播唔播得：有網址先係錄音 */
export const isAvailable = (entry: EpisodeEntry): entry is Recording => 'url' in entry;

/** 節目頁集數清單：錄音同未上架集數一齊，最新喺頂 */
export const entriesNewestFirst = (
    recordings: Recording[],
    unavailable: UnavailableEpisode[],
    showId: ShowId,
): EpisodeEntry[] =>
    [
        ...recordingsForShow(recordings, showId),
        ...unavailableForShow(unavailable, recordings, showId),
    ]
        .sort(byBroadcastTime)
        .reverse();

/** 今日節目表：某日嘅錄音同未上架集數一齊，按播出時間排 */
export const entriesOnDate = (
    recordings: Recording[],
    unavailable: UnavailableEpisode[],
    date: string,
): EpisodeEntry[] =>
    [...showsOnDate(recordings, date), ...unavailableOnDate(unavailable, recordings, date)].sort(
        byBroadcastTime,
    );

/** 今日有錄音而且未聽完嘅節目（主頁節目格加「New」）；聽完（已收聽）就唔再當新 */
export const newShowIds = (
    recordings: Recording[],
    today: string,
    watchedUrls: ReadonlySet<string>,
): Set<ShowId> =>
    new Set(
        recordings.filter((r) => r.date === today && !watchedUrls.has(r.url)).map((r) => r.showId),
    );

/** 嗰日成日嘅節目表：有錄音嘅播得；其他有排播嘅（未開始、未 probe、404）全部當未上架 */
const scheduleOnDate = (recordings: Recording[], date: string): EpisodeEntry[] => {
    const playable = showsOnDate(recordings, date);
    const recorded = new Set(playable.map((r) => r.showId));
    const notUp = showsAiringOn(date)
        .filter((show) => !recorded.has(show.id))
        .map((show): UnavailableEpisode => ({ showId: show.id, date, time: show.fileTime }));
    return [...playable, ...notUp].sort(byBroadcastTime);
};

export interface TodayView {
    /** 今日節目頁顯示嘅日子；冇就 undefined */
    date: string | undefined;
    /** 播得到嘅（卡疊、指示點、自動播放用） */
    playable: Recording[];
    /** 節目表：播得到嘅同未上架嘅一齊，按播出時間排 */
    entries: EpisodeEntry[];
}

/** 今日節目頁：日子只計一次；今日有節目播就列成日節目表，否則用最近有錄音嗰日 */
export const todayView = (
    recordings: Recording[],
    unavailable: UnavailableEpisode[],
    today: string,
): TodayView => {
    const date = pickTodayDate(recordings, today);
    if (!date) {
        return { date, playable: [], entries: [] };
    }
    // 今日有節目播先會揀今日，所以 hasShowsOn(date) 即係「今日」嗰個分支
    const entries = hasShowsOn(date)
        ? scheduleOnDate(recordings, date)
        : entriesOnDate(recordings, unavailable, date);
    return { date, playable: showsOnDate(recordings, date), entries };
};
