import type { MessageKey } from '../i18n/t';

/** 揀中嗰集嘅狀態：播緊 / 聽到一半暫停 / 載入咗未開始（廣播劇頁用嚟換「現正播放」字眼） */
export type PlaybackState = 'playing' | 'paused' | 'ready';

/**
 * 「現正播放」嗰行嘅狀態：再加短篇劇集頁未載入呢套劇——
 * 未聽過（unloaded：冇時間、冇集數，叫用戶揀短篇）/ 聽過（resume：講撳播放會繼續收聽邊集）
 */
export type PlaybackLineState = PlaybackState | 'unloaded' | 'resume';

/** 「現正播放：…」嗰行嘅字眼 */
export const PLAYBACK_LINE_KEY: Readonly<Record<PlaybackLineState, MessageKey>> = {
    playing: 'episodes.nowPlayingLine',
    paused: 'episodes.pausedLine',
    ready: 'episodes.readyLine',
    unloaded: 'drama.pickArcToStart',
    resume: 'drama.continueLine',
};

/** 清單行「播放中 · 0:05 / 21:56」嘅字眼 */
export const PLAYBACK_STATUS_KEY: Readonly<Record<PlaybackState, MessageKey>> = {
    playing: 'episodes.playing',
    paused: 'episodes.paused',
    ready: 'episodes.ready',
};

/** 播緊就係 playing（0:00 都係）；停咗就睇聽到邊：有進度係 paused，0:00 係 ready */
export const playbackStateOf = ({
    isPlaying,
    position,
}: {
    isPlaying: boolean;
    position: number;
}): PlaybackState => {
    if (isPlaying) return 'playing';
    return position > 0 ? 'paused' : 'ready';
};
