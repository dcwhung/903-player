export const HK_TIMEZONE = 'Asia/Hong_Kong';

/** 播放位置 ≥ 總長度嘅 95% 就當聽過 */
export const WATCHED_RATIO = 0.95;
export const PROGRESS_SAVE_INTERVAL_MS = 5000;
export const PROGRESS_STORAGE_KEY = '903player:progress:v1';

export const SKIP_BACK_SECONDS = [60, 30] as const;
export const SKIP_FORWARD_SECONDS = [30, 60] as const;
export const KEYBOARD_SEEK_SECONDS = 30;

/** 弧形 slider：由左下角（135°）順時針掃 270° 去右下角 */
export const ARC_START_DEGREES = 135;
export const ARC_SWEEP_DEGREES = 270;

export const RECORDINGS_DATA_PATH = 'data/recordings.json';

/** 錄音檔只可以嚟自原站 audio host */
export const ALLOWED_AUDIO_ORIGIN = 'https://audio.hkfm903.live';
