// e2e 共用嘅瀏覽器環境：固定時鐘 + 似真嘅 audio host。run.mjs 同 touch.mjs 所有 context 都經呢度開，
// 兩邊唔會各自為政（例如一邊冇固定時鐘就會喺香港時間過咗午夜之後錯）。
import { SAMPLE_RECORDINGS } from './sampleData.mjs';
import { silenceWav } from './silenceWav.mjs';

/**
 * 瀏覽器入面嘅「而家」：固定喺 2026-10-19（一）22:30 香港時間。
 * 假錄音列表（e2e/sampleData.mjs）最後一日係 2026-10-19，斷言都假設「今日」係 19/10：
 * 唔固定嘅話，香港時間一過午夜「今日」就變咗 20/10，今日節目、最近一集全部錯。
 * 揀 22:30：今日嘅日間節目（mini player 嘅在晴朗的一天出發等）已經播完，
 * 公子會（23:08）仲未開咪，所以 audio probe 唔會 probe 佢今日嗰集。
 */
export const E2E_NOW = '2026-10-19T22:30:00+08:00';

export const AUDIO_HOST = 'https://audio.hkfm903.live';
const AUDIO_SECONDS = 600;
const wav = silenceWav(AUDIO_SECONDS);
/** 同 src/services/probeStore.ts 嘅 PROBE_STORAGE_KEY 一樣：app 嘅錄音列表只會由呢度讀 */
export const PROBE_STORAGE_KEY = '903player:probed:v1';

/** 同一個網址可能有唔同編碼寫法（中文字 / %XX），比較前統一 */
const normalizeUrl = (url) => new URL(url).href;

/**
 * 似真嘅 audio host：只答假錄音列表入面（同 extraUrls）嘅檔，其他一律 404，同原站一樣。
 * 以前乜都答 200，app 嘅 audio probe（PR #29）就會「搵到」列表冇嘅集數，令最近一集變咗。
 * 認得嘅檔支援 Range（206 Partial Content），seek 先會成功。
 */
const audioResponder = (extraUrls) => {
    const known = new Set([...SAMPLE_RECORDINGS.map((r) => r.url), ...extraUrls].map(normalizeUrl));
    return (route) => {
        if (!known.has(normalizeUrl(route.request().url()))) {
            return route.fulfill({ status: 404, body: '' });
        }
        const range = /bytes=(\d+)-(\d*)/.exec(route.request().headers().range ?? '');
        const start = range ? Number(range[1]) : 0;
        const end = range && range[2] ? Number(range[2]) : wav.length - 1;
        return route.fulfill({
            status: range ? 206 : 200,
            headers: {
                'Content-Type': 'audio/wav',
                'Accept-Ranges': 'bytes',
                'Content-Length': String(end - start + 1),
                ...(range ? { 'Content-Range': `bytes ${start}-${end}/${wav.length}` } : {}),
            },
            body: wav.subarray(start, end + 1),
        });
    };
};

/**
 * 喺瀏覽器入面行（addInitScript）：storage 未有先寫入假錄音，當係用戶之前 probe 到嘅。
 * 每次 navigation（包括 reload）都會行，所以已有就唔好蓋過，否則 probe 寫低嘅結果會冇咗。
 * about:blank 等冇 origin 嘅頁面讀 localStorage 會 throw，直接略過
 */
const seedProbeStore = ({ key, found }) => {
    try {
        if (localStorage.getItem(key) === null) {
            localStorage.setItem(key, JSON.stringify({ found, misses: {} }));
        }
    } catch {
        // 冇 localStorage 就唔使 seed
    }
};

/**
 * 開一個 e2e context：時鐘由 E2E_NOW 開始照常行（clock.install 唔會暫停，
 * setTimeout / setInterval / Date.now 跟真實時間前進，播放進度、定時存進度、更新檢查照行），
 * audio host 用上面嘅似真版本。extraAudioUrls：額外當係存在嘅檔（例如測 probe 搵到新一集）。
 */
export const newE2EContext = async (browser, options = {}, { extraAudioUrls = [] } = {}) => {
    const ctx = await browser.newContext(options);
    await ctx.clock.install({ time: new Date(E2E_NOW) });
    await ctx.route(`${AUDIO_HOST}/**`, audioResponder(extraAudioUrls));
    await ctx.addInitScript(seedProbeStore, { key: PROBE_STORAGE_KEY, found: SAMPLE_RECORDINGS });
    return ctx;
};
