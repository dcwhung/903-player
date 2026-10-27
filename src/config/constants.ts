export const HK_TIMEZONE = 'Asia/Hong_Kong';

/** 播放位置 ≥ 總長度嘅 95% 就當聽過 */
export const WATCHED_RATIO = 0.95;
export const PROGRESS_SAVE_INTERVAL_MS = 5000;
/** 自動播下一集之後咁耐都未出聲，就當卡住（iOS 鎖屏時見過停喺 0:00）重新載入 */
export const STALL_RETRY_MS = 8000;
/** 自動播下一集卡住最多重試幾次 */
export const STALL_MAX_RETRIES = 3;
/** 聽過嘅錄音由頭重播，真正播咗咁多秒先清走「已收聽」（防自動播放 / 誤撳） */
export const REPLAY_RESET_SECONDS = 10;
export const PROGRESS_STORAGE_KEY = '903player:progress:v1';
/** 主頁上次揀咗「節目」定「廣播劇」tab */
export const HOME_TAB_STORAGE_KEY = '903player:home-tab:v1';

/** 鎖屏 / 耳機嘅前後掣每次跳幾多秒 */
export const LOCK_SCREEN_SKIP_SECONDS = 30;
export const KEYBOARD_SEEK_SECONDS = 30;

/** 弧形 slider：由左下角（135°）順時針掃 270° 去右下角 */
export const ARC_START_DEGREES = 135;
export const ARC_SWEEP_DEGREES = 270;

/** 錄音檔只可以嚟自原站 audio host */
export const ALLOWED_AUDIO_ORIGIN = 'https://audio.hkfm903.live';

/** 廣播劇錄音（Cloudflare R2 public bucket「radio-drama」）：<劇集 folder>/<短篇 folder>/<檔名> */
/** 新上架短篇由上架日起計幾多日內有「新」 */
export const NEW_ARC_DAYS = 14;

export const DRAMA_AUDIO_BASE = 'https://pub-e141dd7a994b40a3b789970739470b2d.r2.dev';

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
