// @vitest-environment node
// 放喺 src/（tsconfig.app.json 範圍）：有 vite/client type，import 到用 import.meta.glob 嘅模組
// （例如 probeStore.ts），亦唔會將 src 模組拖入 tsconfig.node.json（S-545）。
// e2e/*.mjs 係純 node 模組（冇型別），喺 node 環境 import 佢哋嘅 export，同 src 常數逐個比較。
// e2e import 唔到 TS，只可以手抄；呢個測試保證改 src 時 e2e 唔會靜靜雞脫節（S-528）
import { DRAMA_AUDIO_BASE } from '@903-player/catalog';
import { DRAG_INTENT_PX } from './hooks/swipe';
import {
    SHEET_DISMISS_RATIO,
    SHEET_FLICK_MIN_PX,
    SHEET_FLICK_VELOCITY_PX_PER_MS,
} from './components/pages/drama/ArcSheet/sheetDrag';
import { VELOCITY_WINDOW_MS } from './components/pages/today/ShowCardStack/cardStack';
import { SWIPE_REMOVE_RATIO } from './components/pages/home/SavedTab/useRowSwipe';
import {
    ALLOWED_AUDIO_ORIGIN,
    BOOKMARK_STORAGE_KEY,
    BOOKMARK_STORE_VERSION,
    EARLY_ADVANCE_SECONDS,
    PLAYBACK_LOG_STORAGE_KEY,
    PROGRESS_STORAGE_KEY,
    STALL_FIRST_RETRY_MS,
    STALL_HIDDEN_MARK_MS,
    STALL_MAX_RETRIES,
} from './config/constants';
import { PROBE_STORAGE_KEY } from './services/probeStore';
import { E2E_FIXTURES_KEY } from './catalog/dramas/lib/e2eFixtures';
// ?raw：index.html 原始字串，搵出佢引用嘅外部 host
import indexHtml from '../index.html?raw';

type E2EModule = Record<string, unknown>;

/** 用網址動態 import：TS 唔會去解析冇型別嘅 .mjs（唔使 allowJs，亦唔使為 e2e 另寫 .d.ts） */
const importE2E = (file: string): Promise<E2EModule> =>
    import(
        /* @vite-ignore */ new URL(`../e2e/${file}`, import.meta.url).href
    ) as Promise<E2EModule>;

describe('e2e copies of src constants', () => {
    // 測試劇（P8 #6）開關：脫節嘅話即將上架 / 快將下架 section 搵唔到測試劇
    it('should keep comingSoon.mjs E2E_FIXTURES_KEY equal to src', async () => {
        const comingSoon = await importE2E('comingSoon.mjs');

        expect(comingSoon.E2E_FIXTURES_KEY).toBe(E2E_FIXTURES_KEY);
    });

    it.each([
        ['AUDIO_HOST', ALLOWED_AUDIO_ORIGIN],
        ['DRAMA_AUDIO_BASE', DRAMA_AUDIO_BASE],
        // e2e seed 假錄音用嘅 key：脫節嘅話 app 讀唔到假錄音，清單全空
        ['PROBE_STORAGE_KEY', PROBE_STORAGE_KEY],
        // 鎖屏狀態要喺首個卡住 deadline 之前讀（PLAYBACK_STATE_WAIT_MS 由佢計），S-582
        ['STALL_FIRST_RETRY_MS', STALL_FIRST_RETRY_MS],
    ])('should keep harness.mjs %s equal to src', async (name, expected) => {
        const harness = await importE2E('harness.mjs');

        expect(harness[name]).toBe(expected);
    });

    it.each([
        ['SHEET_DISMISS_RATIO', SHEET_DISMISS_RATIO],
        ['SHEET_FLICK_VELOCITY_PX_PER_MS', SHEET_FLICK_VELOCITY_PX_PER_MS],
        ['SHEET_FLICK_MIN_PX', SHEET_FLICK_MIN_PX],
        ['VELOCITY_WINDOW_MS', VELOCITY_WINDOW_MS],
        ['DRAG_INTENT_PX', DRAG_INTENT_PX],
    ])('should keep arcSheet.mjs %s equal to src', async (name, expected) => {
        const arcSheet = await importE2E('arcSheet.mjs');

        expect(arcSheet[name]).toBe(expected);
    });

    // 收藏 e2e：seed 收藏用 app 嘅 key / 版本，左滑拖過 app 嘅移除比例
    it.each([
        ['BOOKMARK_STORAGE_KEY', BOOKMARK_STORAGE_KEY],
        ['BOOKMARK_STORE_VERSION', BOOKMARK_STORE_VERSION],
        ['SWIPE_REMOVE_RATIO', SWIPE_REMOVE_RATIO],
    ])('should keep bookmark.mjs %s equal to src', async (name, expected) => {
        const bookmark = await importE2E('bookmark.mjs');

        expect(bookmark[name]).toBe(expected);
    });

    // 背景播放 e2e：讀 app 嘅 storage、按 app 嘅 deadline 等（脫節會讀錯 key / 等錯時間）
    it.each([
        ['PLAYBACK_LOG_STORAGE_KEY', PLAYBACK_LOG_STORAGE_KEY],
        ['PROGRESS_STORAGE_KEY', PROGRESS_STORAGE_KEY],
        ['STALL_HIDDEN_MARK_MS', STALL_HIDDEN_MARK_MS],
        ['EARLY_ADVANCE_SECONDS', EARLY_ADVANCE_SECONDS],
        ['STALL_MAX_RETRIES', STALL_MAX_RETRIES],
    ])('should keep hiddenPlayback.mjs %s equal to src', async (name, expected) => {
        const hidden = await importE2E('hiddenPlayback.mjs');

        expect(hidden[name]).toBe(expected);
    });
});

describe('e2e offline mocks', () => {
    it('should mock every external host index.html references', async () => {
        const harness = await importE2E('harness.mjs');
        const mocked = [harness.GOOGLE_FONTS_CSS, harness.GOOGLE_FONTS_FILES];
        // 掃晒所有 http(s) 網址，唔止 href=：<script src>、inline script / style 嘅 url(...) 都會出網（S-576）
        const linked = [...indexHtml.matchAll(/https?:\/\/[^\s"'`<>()]+/g)].map(
            ([url]) => new URL(url).origin,
        );

        expect(linked.length).toBeGreaterThan(0);
        expect(new Set(linked)).toEqual(new Set(mocked));
    });
});
