import type { DramaEpisode } from './drama';
import type { Recording } from './recording';

/** player 播得嘅嘢：903 節目錄音或者廣播劇一集（player 只用 url，其他資料畀畫面顯示） */
export type Track = Recording | DramaEpisode;

export const isDramaEpisode = (track: Track): track is DramaEpisode => 'dramaId' in track;

/** 903 節目錄音先有 showId；廣播劇返回 null */
export const asShowRecording = (track: Track | null): Recording | null =>
    track && !isDramaEpisode(track) ? track : null;
