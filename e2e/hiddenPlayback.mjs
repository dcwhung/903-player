// 背景播放 e2e：app 喺背景（鎖屏 / 切 app）時嘅播放規則。Playwright 冇 hidden page API，
// 所以用 init script 改寫 document.visibilityState / hidden 再發 visibilitychange：只瞞到 app 嘅 JS，
// Chromium 唔會因此節流 timer，iOS 凍結 JS 嘅情況要靠 unit test（AudioController.test.ts）
import { DRAMA_AUDIO_BASE, newE2EPage, serveWav, succeeds } from './harness.mjs';
import { SERIES_ROUTE, dismissAutoSheet } from './dramaPages.mjs';

// 以下係手抄 src/config/constants.ts，由 src/e2eSrcConstants.test.ts 鎖住一致
export const PLAYBACK_LOG_STORAGE_KEY = '903player:playback-log:v1';
export const PROGRESS_STORAGE_KEY = '903player:progress:v1';
/** 背景卡住咁耐先報卡住（鎖屏掣變 Play） */
export const STALL_HIDDEN_MARK_MS = 12000;
/** 離尾咁多秒就換下一集 */
export const EARLY_ADVANCE_SECONDS = 1;
/** 每輪最多重試幾多次：第一次 retry 嘅 log 係 left=STALL_MAX_RETRIES */
export const STALL_MAX_RETRIES = 3;

// 跳去離尾幾秒，等 app 自己喺尾段換集
const SEEK_BEFORE_END_SECONDS = EARLY_ADVANCE_SECONDS + 2;
// 位置行咗咁多秒先當真係出緊聲（多過 app 嘅 AUDIBLE_ADVANCE_SECONDS 0.3）
const AUDIBLE_SECONDS = 1;
// 撳播放 / 換集之後最多等咁耐出聲
const PLAY_WAIT_MS = 10_000;
// 報卡住 / 亮屏重試最多等咁耐（CPU 爭用留位）
const MARK_MARGIN_MS = 3000;
// 存進度嘅位置同轉背景嗰刻位置最多差咁多秒
const SAVED_POSITION_TOLERANCE_SECONDS = 1;

/**
 * 喺瀏覽器入面行（addInitScript）：visibility 由 window.__e2eHidden 話事；
 * 記低 app 撳 play() 嘅 audio element（佢唔喺 DOM）畀 e2e 讀位置 / 跳位
 */
const installHiddenControl = () => {
    window.__e2eHidden = false;
    Object.defineProperty(Document.prototype, 'visibilityState', {
        configurable: true,
        get: () => (window.__e2eHidden ? 'hidden' : 'visible'),
    });
    Object.defineProperty(Document.prototype, 'hidden', {
        configurable: true,
        get: () => window.__e2eHidden,
    });
    const play = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function capturePlay(...args) {
        window.__e2eAudio = this;
        return play.apply(this, args);
    };
};

/** 轉去背景 / 返前景：同真瀏覽器一樣發 visibilitychange */
const setHidden = (p, hidden) =>
    p.evaluate((value) => {
        window.__e2eHidden = value;
        document.dispatchEvent(new Event('visibilitychange'));
    }, hidden);

const audioState = (p) =>
    p.evaluate(() => ({
        src: window.__e2eAudio?.src ?? '',
        time: window.__e2eAudio?.currentTime ?? 0,
        duration: window.__e2eAudio?.duration ?? 0,
    }));

/** 等 audio 播緊 src（唔係 notSrc）而且位置行咗 AUDIBLE_SECONDS */
const waitAudible = (p, notSrc = '') =>
    succeeds(
        p.waitForFunction(
            ({ skip, seconds }) =>
                window.__e2eAudio &&
                window.__e2eAudio.src !== skip &&
                !window.__e2eAudio.paused &&
                window.__e2eAudio.currentTime >= seconds,
            { skip: notSrc, seconds: AUDIBLE_SECONDS },
            { timeout: PLAY_WAIT_MS },
        ),
    );

const retryLines = (p) =>
    p.evaluate(
        (key) => JSON.parse(localStorage.getItem(key) ?? '[]').filter((l) => l.includes(' retry ')),
        PLAYBACK_LOG_STORAGE_KEY,
    );

const savedPosition = (p, url) =>
    p.evaluate(({ key, src }) => JSON.parse(localStorage.getItem(key) ?? '{}')[src]?.position, {
        key: PROGRESS_STORAGE_KEY,
        src: url,
    });

/** 等 app 換咗去另一集（src 唔係 fromSrc） */
const waitSwitched = (p, fromSrc) =>
    succeeds(
        p.waitForFunction((from) => window.__e2eAudio?.src !== from, fromSrc, {
            timeout: PLAY_WAIT_MS,
        }),
    );

/** 跳去離尾 SEEK_BEFORE_END_SECONDS：app 會喺尾段自己換下一集 */
const seekNearEnd = (p) =>
    p.evaluate((before) => {
        const audio = window.__e2eAudio;
        audio.currentTime = audio.duration - before;
    }, SEEK_BEFORE_END_SECONDS);

/**
 * 短篇劇集頁第一集開播（劇集音檔用靜音 WAV 答）。
 * hangAfterFirst：第一個音檔以外嘅 request 永遠唔答（下一集載入卡死，好似轉網絡斷咗）
 */
const startSeries = async (env, label, { hangAfterFirst = false } = {}) => {
    const { browser, base, errors, log } = env;
    const { ctx, p } = await newE2EPage(browser, errors);
    await ctx.addInitScript(installHiddenControl);
    let firstUrl;
    await ctx.route(`${DRAMA_AUDIO_BASE}/**`, (route) => {
        firstUrl ??= route.request().url();
        // 唔答 = 一直 pending，ctx.close 時 Playwright 會清走
        if (hangAfterFirst && route.request().url() !== firstUrl) return undefined;
        return serveWav(route);
    });
    await p.goto(`${base}${SERIES_ROUTE}`);
    const ready = await dismissAutoSheet(p, log, label);
    if (ready) await p.getByRole('button', { name: '播放', exact: true }).click();
    const playing = ready && (await waitAudible(p));
    log(playing, `${label}：第一集開播出聲`);
    return { ctx, p, playing };
};

/** 情境 3：轉背景嗰刻存低進度（唔使等每 5 s 一次嘅定時存） */
const checkSavesOnHide = async (p, label) => {
    const before = await audioState(p);
    await setHidden(p, true);
    const saved = await savedPosition(p, before.src);
    return {
        ok:
            saved !== undefined &&
            Math.abs(saved - before.time) <= SAVED_POSITION_TOLERANCE_SECONDS,
        msg: `${label}：轉背景即刻存進度（位置 ${before.time.toFixed(1)}s，存咗 ${saved?.toFixed(1)}s）`,
    };
};

/** 情境 1 + 3：背景播到尾自動接住播下一集，唔 reload；轉背景嗰刻有存進度 */
const checkHiddenAdvance = async (env) => {
    const { log } = env;
    const label = '背景接住播';
    const { ctx, p, playing } = await startSeries(env, label);
    if (playing) {
        const saved = await checkSavesOnHide(p, label);
        log(saved.ok, saved.msg);
        const first = await audioState(p);
        await seekNearEnd(p);
        const advanced = await waitAudible(p, first.src);
        const retries = await retryLines(p);
        const state = await p.evaluate(() => navigator.mediaSession.playbackState);
        log(
            advanced && retries.length === 0 && state === 'playing',
            `${label}：背景播完自動播下一集出聲、冇 reload（換集 ${advanced}，retry ${retries.length}，鎖屏 ${state}）`,
        );
    }
    await ctx.close();
};

/** 情境 2：背景換集之後下一集載入卡死：背景唔 reload，過咗 mark 先報卡住，返前景即刻重試一次 */
const checkHiddenStall = async (env) => {
    const { log } = env;
    const label = '背景卡住';
    const { ctx, p, playing } = await startSeries(env, label, { hangAfterFirst: true });
    if (playing) {
        await setHidden(p, true);
        const first = await audioState(p);
        await seekNearEnd(p);
        const switched = await waitSwitched(p, first.src);
        log(switched, `${label}：背景播完換咗去下一集`);
        const marked = await succeeds(
            p.waitForFunction(() => navigator.mediaSession.playbackState === 'paused', undefined, {
                timeout: STALL_HIDDEN_MARK_MS + MARK_MARGIN_MS,
            }),
        );
        log(marked, `${label}：等夠 ${STALL_HIDDEN_MARK_MS / 1000}s 鎖屏報卡住（顯示 Play）`);
        // 報卡住先數：4 s / 8 s / 12 s 嘅 deadline 都過咗，唔使固定 sleep（S-529、S-627）
        const early = await retryLines(p);
        log(
            early.length === 0,
            `${label}：背景過咗所有 deadline 都唔 reload（retry ${early.length}）`,
        );
        await setHidden(p, false);
        const retried = await succeeds(
            p.waitForFunction(
                ({ key, left }) =>
                    JSON.parse(localStorage.getItem(key) ?? '[]').some(
                        (l) => l.includes(' retry ') && l.endsWith(` left=${left}`),
                    ),
                { key: PLAYBACK_LOG_STORAGE_KEY, left: STALL_MAX_RETRIES },
                { timeout: MARK_MARGIN_MS },
            ),
        );
        const total = (await retryLines(p)).length;
        log(
            retried && total === 1,
            `${label}：返前景即刻重試一次（left=${STALL_MAX_RETRIES} ${retried}，retry ${total}）`,
        );
    }
    await ctx.close();
};

/** 背景播放：接住播、存進度、卡住唔 reload */
export const runHiddenPlaybackChecks = async (env) => {
    await checkHiddenAdvance(env);
    await checkHiddenStall(env);
};
