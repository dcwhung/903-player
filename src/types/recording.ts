export type ShowId = 'badgirl' | 'gongzi' | 'wanni' | 'sunnyday' | 'westair';

export interface Recording {
    showId: ShowId;
    /** 香港日期，格式 YYYY-MM-DD */
    date: string;
    /** 開咪時間，格式 HHMM */
    time: string;
    url: string;
}

export interface RecordingsFeed {
    generatedAt: string;
    recordings: Recording[];
}
