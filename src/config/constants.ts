export const HK_TIMEZONE = 'Asia/Hong_Kong';

/** 播放位置 ≥ 總長度嘅 95% 就當聽過 */
export const WATCHED_RATIO = 0.95;
export const PROGRESS_SAVE_INTERVAL_MS = 5000;
/** 聽過嘅錄音由頭重播，真正播咗咁多秒先清走「已收聽」（防自動播放 / 誤撳） */
export const REPLAY_RESET_SECONDS = 10;
export const PROGRESS_STORAGE_KEY = '903player:progress:v1';

export const SKIP_BACK_SECONDS = [60, 30] as const;
export const SKIP_FORWARD_SECONDS = [30, 60] as const;
export const KEYBOARD_SEEK_SECONDS = 30;

/** 弧形 slider：由左下角（135°）順時針掃 270° 去右下角 */
export const ARC_START_DEGREES = 135;
export const ARC_SWEEP_DEGREES = 270;

/** 錄音檔只可以嚟自原站 audio host */
export const ALLOWED_AUDIO_ORIGIN = 'https://audio.hkfm903.live';

/**
 * 捽碟加速：慢慢捽轉一圈 = 60 秒（微調），捽得快每圈最多 = 10 分鐘（粗調）；
 * 手指轉速（度 / 毫秒）喺 SLOW 至 FAST 之間線性加速
 */
export const DISC_SCRUB_MIN_SECONDS_PER_TURN = 60;
export const DISC_SCRUB_MAX_SECONDS_PER_TURN = 600;
export const DISC_SCRUB_SLOW_DEGREES_PER_MS = 0.15;
export const DISC_SCRUB_FAST_DEGREES_PER_MS = 1.35;
/** 離圓心半徑兩成以內（spindle 附近）角度唔穩定，唔計 */
export const DISC_SCRUB_DEAD_ZONE_RATIO = 0.2;
/** 轉少過呢個角度當係 tap，唔 seek */
export const DISC_SCRUB_MIN_DEGREES = 6;
