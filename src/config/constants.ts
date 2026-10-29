export const HK_TIMEZONE = 'Asia/Hong_Kong';

/** 播放位置 ≥ 總長度嘅 95% 就當聽過 */
export const WATCHED_RATIO = 0.95;
export const PROGRESS_SAVE_INTERVAL_MS = 5000;
/**
 * 有下一集時，播到剩低咁多秒就換集（唔等 ended）：iOS 喺 ended 嗰下收起 audio session，
 * 鎖屏 / 背景開唔返，下一集會「播緊但冇聲」或者卡喺 0:00
 */
export const EARLY_ADVANCE_SECONDS = 1;
/**
 * 卡住重試之間嘅時間（第一次用 STALL_FIRST_RETRY_MS）：前景咁耐都未出聲就重新載入
 * （iOS 鎖屏見過停喺 0:00，亦見過位置凍結；鎖屏時唔自動 reload，見 STALL_HIDDEN_MARK_MS）
 */
export const STALL_RETRY_MS = 8000;
/**
 * 每次撳播（包括鎖屏 / AirPods / 自動接住播）之後第一次檢查卡住嘅時間：比 STALL_RETRY_MS 短，
 * 因為 iOS 鎖屏時用戶操作之後 JS 只會再行一陣（S-551 log：第二個 8 秒 timer 等咗 34 秒先行）。
 * 只喺前景（document visible）先會因為佢 reload：鎖屏時 iOS 由 loadstart 到 loadeddata 要 ~4.3 s，
 * 4 s reload 會 abort 載緊嘅下一集，之後背景再唔載完（v1.20.7 回歸，v1.20.8 修正）。
 * 鎖屏時過咗佢只係「overdue」：亮屏（retryIfOverdue）/ 鎖屏 Play（resume）先 reload；
 * 例外：已發 playing、數據夠播而位置凍結（pipeline 死咗，見 FROZEN_PLAYING_MS）照樣 reload（v1.20.9）。
 * 「鎖屏」泛指所有 document hidden（切 app / 背景 tab 都一樣，S-615）。
 * e2e/harness.mjs 有副本（等鎖屏狀態嘅時間由佢計），src/e2eSrcConstants.test.ts 鎖住
 */
export const STALL_FIRST_RETRY_MS = 4000;
/**
 * 鎖屏（document hidden）時由今次嘗試開始計，等咁耐都未出聲先標 isStalled（鎖屏顯示 Play，畀用戶撳）。
 * 要遠長過正常鎖屏載入（~4–5 s，v1.20.6 log loadstart → loadeddata 4.07 s），
 * 否則正常接住播都會閃一下「停咗」。鎖屏仲載緊時唔自動 reload，亦唔扣重試次數（v1.20.8）
 */
export const STALL_HIDDEN_MARK_MS = 12000;
/**
 * 發咗 playing、readyState ≥ HAVE_FUTURE_DATA 而位置咁耐都冇行：當 pipeline 死咗（S-551 情境 2，
 * 拔 AirPods 再鎖屏 Play）。冇嘢載緊（已發 playing），唔 reload 就永遠救唔返，所以鎖屏都 reload
 * （load() 會清 buffer 重新下載，但唔會打斷一個進行中嘅載入，S-616）；
 * 鎖屏 Play（resume）見到上一次嘗試係咁亦即刻 reload，而唔係淨係 play()（v1.20.9）。
 * 鎖屏 timeupdate 約 5 秒先一次而 log 見過 playing 後 ~0.9 s 先出聲：用 3.5 s（約 3.5 倍）避免
 * 快嘅鎖屏載入被誤判凍結 reload，重演 v1.20.7（W-506）；又要短過 STALL_FIRST_RETRY_MS，
 * 鎖屏 Play 後 ~22 ms 就發 playing 嘅凍結（AirPods log）先可以喺第一個 deadline 就 reload（W-508）
 */
export const FROZEN_PLAYING_MS = 3500;
/**
 * 卡住 deadline 到咗但下載仲有進展（慢網）時，隔咁耐再睇一次：唔扣重試次數（W-498）
 */
export const STALL_PROGRESS_RECHECK_MS = 4000;
/**
 * 下載有進展都最多等咁耐（由撳播計）：避免一直「有少少進展」拖住永遠唔重試（W-498）。
 * 最後一次 recheck 會截短，剛好喺呢個時間重試（S-582）
 */
export const STALL_MAX_WAIT_MS = 30000;
/**
 * 位置前面已經載咗咁多秒但位置唔行，就算 buffer 仲增長都當卡住（S-551 情境 2：
 * 數據到晒但 pipeline 死咗）；少過呢個數當仲載緊、慢網開播（W-498）
 */
export const STALL_DATA_AHEAD_SECONDS = 10;
/** 每次撳播之後卡住最多重試幾次 */
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

export const MS_PER_SECOND = 1000;
/** 報畀鎖屏嘅播放速度（app 冇變速） */
export const MEDIA_SESSION_PLAYBACK_RATE = 1;
/**
 * 鎖屏位置同真正位置差過咁多秒（即係 seek 咗）先再 setPositionState；
 * 平時 timeupdate 每 0.25 秒一次，唔使逐下報
 */
export const MEDIA_POSITION_DRIFT_SECONDS = 2;

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
