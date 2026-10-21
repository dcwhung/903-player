import type { EpisodeEntry, Recording, ShowId, UnavailableEpisode } from '../types/recording';

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

/**
 * 今日有錄音（或者有未上架集數）就用今日，否則用今日之前最近一個有錄音嘅日子。
 * 今日全部未上架都用今日：清單照列出今日節目（全部灰），唔會跳去舊日子播
 */
export const pickTodayDate = (
    recordings: Recording[],
    today: string,
    unavailable: UnavailableEpisode[] = [],
): string | undefined => {
    if (unavailable.some((u) => u.date === today)) {
        return today;
    }
    const dates = [...new Set(recordings.map((r) => r.date))].sort();
    return dates.findLast((date) => date <= today) ?? dates[0];
};

/** 某日嘅錄音，按播出時間排 */
export const showsOnDate = (recordings: Recording[], date: string): Recording[] =>
    recordings.filter((r) => r.date === date).sort(byBroadcastTime);

/** 今日（香港時間）有錄音就用今日，否則用最近有錄音嗰日，按播出時間排；今日全部未上架就冇 */
export const todayRecordings = (
    recordings: Recording[],
    today: string,
    unavailable: UnavailableEpisode[] = [],
): Recording[] => {
    const date = pickTodayDate(recordings, today, unavailable);
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
