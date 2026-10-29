export const HK_TIMEZONE = 'Asia/Hong_Kong';

/** 播放位置 ≥ 總長度嘅 95% 就當聽過 */
export const WATCHED_RATIO = 0.95;
export const PROGRESS_SAVE_INTERVAL_MS = 5000;
/**
 * 有下一集時，播到剩低咁多秒就換集（唔等 ended）：iOS 喺 ended 嗰下收起 audio session，
 * 鎖屏 / 背景開唔返，下一集會「播緊但冇聲」或者卡喺 0:00
 */
export const EARLY_ADVANCE_SECONDS = 1;
/** 自動播下一集之後咁耐都未出聲，就當卡住（iOS 鎖屏時見過停喺 0:00）重新載入 */
export const STALL_RETRY_MS = 8000;
/**
 * 每次撳播（包括鎖屏 / AirPods / 自動接住播）之後第一次檢查卡住嘅時間：比 STALL_RETRY_MS 短，
 * 因為 iOS 鎖屏時用戶操作之後 JS 只會再行一陣（S-551 log：第二個 8 秒 timer 等咗 34 秒先行）
 */
export const STALL_FIRST_RETRY_MS = 4000;
/**
 * 亮屏時重試前，對上一次重試要隔咗咁耐：iOS 鎖屏暫停咗嘅 timer 會喺亮屏嗰下先行，
 * 唔擋嘅話 timer + visibilitychange 65 ms 內連續重試兩次（S-551）
 */
export const STALL_RETRY_DEDUPE_MS = 1000;
/** 自動播下一集卡住最多重試幾次 */
export const STALL_MAX_RETRIES = 3;
/**
 * 位置由開始播嗰下行咗咁多秒先當「真正出聲」：iOS 鎖屏有 playing event 但位置凍結冇聲（S-551）。
 * timeupdate 大約 0.25 秒一次，即係第二下 tick 左右確認
 */
export const AUDIBLE_ADVANCE_SECONDS = 0.3;
/** 播放診斷 log（版本號連撳 5 下複製）：iPhone 鎖屏換集冇聲，要實機 event 先知原因 */
export const PLAYBACK_LOG_STORAGE_KEY = '903player:playback-log:v1';
/** log 最多留幾多行（舊嘅先清走） */
export const PLAYBACK_LOG_MAX_ENTRIES = 400;
/** timeupdate 太密，最少隔咁耐先記一次（睇到背景時間有冇真係行） */
export const PLAYBACK_LOG_TICK_MS = 5000;
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
