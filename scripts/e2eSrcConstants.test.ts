// @vitest-environment node
// 放喺 scripts/：e2e/*.mjs 係純 node 模組（冇型別），喺 node 環境 import 佢哋嘅 export，
// 同 src 常數逐個比較。e2e import 唔到 TS，只可以手抄；呢個測試保證改 src 時 e2e 唔會靜靜雞脫節（S-528）
import { DRAG_INTENT_PX } from '../src/hooks/swipe';
import {
    SHEET_DISMISS_RATIO,
    SHEET_FLICK_MIN_PX,
    SHEET_FLICK_VELOCITY_PX_PER_MS,
} from '../src/components/ArcSheet/sheetDrag';
import { VELOCITY_WINDOW_MS } from '../src/components/ShowCardStack/cardStack';
import { ALLOWED_AUDIO_ORIGIN, DRAMA_AUDIO_BASE } from '../src/config/constants';

type E2EModule = Record<string, unknown>;

/** 用網址動態 import：TS 唔會去解析冇型別嘅 .mjs（唔使為 e2e 另寫 .d.ts） */
const importE2E = (file: string): Promise<E2EModule> =>
    import(
        /* @vite-ignore */ new URL(`../e2e/${file}`, import.meta.url).href
    ) as Promise<E2EModule>;

describe('e2e copies of src constants', () => {
    it.each([
        ['AUDIO_HOST', ALLOWED_AUDIO_ORIGIN],
        ['DRAMA_AUDIO_BASE', DRAMA_AUDIO_BASE],
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
});
