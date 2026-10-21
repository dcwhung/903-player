export type ShowId = 'badgirl' | 'gongzi' | 'wanni' | 'sunnyday' | 'westair' | 'waves' | 'lalala';

export interface Recording {
    showId: ShowId;
    /** 香港日期，格式 YYYY-MM-DD */
    date: string;
    /** 開咪時間，格式 HHMM */
    time: string;
    url: string;
}

/** 試過但原站未有（404）嘅集數：清單照列出，但播唔到 */
export interface UnavailableEpisode {
    showId: ShowId;
    /** 香港日期，格式 YYYY-MM-DD */
    date: string;
    /** 開咪時間，格式 HHMM */
    time: string;
}

/** 清單一行：播得到嘅錄音，或者未上架嘅集數 */
export type EpisodeEntry = Recording | UnavailableEpisode;

export interface RecordingsFeed {
    generatedAt: string;
    recordings: Recording[];
}
