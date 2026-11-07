import type { Folder, FolderSource } from '@903-player/catalog';
/*
 * e2e 測試劇（P8 #6 即將上架 / 快將下架）：只係 `vite build --mode e2e`（npm run e2e）先會用到，
 * production build 嘅 MODE 唔係 e2e，成段（連 e2e/fixtures 嘅 JSON）由 tree-shaking 剷走。
 * e2e context 要寫 localStorage E2E_FIXTURES_KEY 先加入（e2e/comingSoon.mjs），其他 e2e section 照舊得真 catalog。
 * 唔另外放圖：借 library 現有劇集嘅圖（同一套檔名）
 */

/** 同 e2e/comingSoon.mjs 一樣（src/e2eSrcConstants.test.ts 鎖住） */
export const E2E_FIXTURES_KEY = '903player:e2e:dramas';

const definitions = import.meta.glob<unknown>('../../../../e2e/fixtures/dramas/*/drama.json', {
    eager: true,
    import: 'default',
});

const KEY_PATTERN = /\/e2e\/fixtures\/dramas\/([^/]+)\/drama\.json$/;
/** 借邊套劇嘅圖：整套新劇用 18 樓 C 座（同 mockup ⑦ 一樣），其他用蘭茜夫人劇場 */
const IMAGES_FROM: Readonly<Record<string, string>> = { 'e2e-upcoming': 'c18' };
const DEFAULT_IMAGES_FROM = 'lancy';

const enabled = (): boolean => {
    try {
        return localStorage.getItem(E2E_FIXTURES_KEY) === '1';
    } catch {
        return false;
    }
};

const toFolder = (base: readonly Folder[], [key, definition]: [string, unknown]): Folder[] => {
    const id = KEY_PATTERN.exec(key)?.[1];
    const donor = base.find((f) => f.id === (IMAGES_FROM[id ?? ''] ?? DEFAULT_IMAGES_FROM));
    if (!id || !donor) return [];
    return [
        { id, source: `e2e/fixtures/dramas/${id}/drama.json`, definition, images: donor.images },
    ];
};

/** 真 catalog + e2e 測試劇（未開 flag 就淨係真 catalog） */
export const withE2EFixtures = (source: FolderSource): FolderSource => ({
    folders: () => {
        const base = source.folders();
        if (!enabled()) return base;
        return [...base, ...Object.entries(definitions).flatMap((entry) => toFolder(base, entry))];
    },
});
