// @vitest-environment node
// 要用 node:fs 讀 CSS 原文：*.node.test.ts 行 tsconfig.node.json（有 Node 型別），唔會漏入 app 程式
import { cssDeclarations, readCss } from '../../tests/cssRule';

/*
 * 同 T8 sheet 一樣（sheetBottomInset.node.test.ts）：節目頁 / 廣播劇頁 / 今日節目頁嘅清單係頁底最後一樣嘢
 * （mini player 只喺主頁，下面冇其他嘢再留安全區；.fixed 頁底 padding 係 0），
 * iOS standalone viewport 已經停喺 home indicator 上面時，env(safe-area-inset-bottom) 照報 34px 會留兩次。
 * 清單底改用 --safe-area-bottom-visible；預留高度（--player-reserved-height）跟返同一個值
 */
const episodeList = readCss(
    new URL('../components/shared/player/EpisodeList/EpisodeList.module.css', import.meta.url),
);
const todayList = readCss(
    new URL('../components/pages/today/TodayShowList/TodayShowList.module.css', import.meta.url),
);
const tokens = readCss(new URL('./tokens.css', import.meta.url));

const LIST_PADDING = '0 0 calc(var(--safe-area-bottom-visible) + var(--space-2))';

describe('list bottom inset', () => {
    it('should pad the episode list by the visible safe area only', () => {
        expect(cssDeclarations(episodeList, '.list').padding).toBe(LIST_PADDING);
    });

    it('should pad the today show list the same way', () => {
        expect(cssDeclarations(todayList, '.list').padding).toBe(LIST_PADDING);
    });

    it('should not use the raw bottom inset in either list', () => {
        for (const css of [episodeList, todayList]) {
            expect(css).not.toMatch(/env\(safe-area-inset-bottom\)/);
        }
    });

    it('should reserve the same visible safe area under the list in the player height budget', () => {
        const budget = (/--player-reserved-height:([^;]+);/.exec(tokens)?.[1] ?? '').replace(
            /\s+/g,
            ' ',
        );
        expect(budget).toContain('var(--space-2) + var(--safe-area-bottom-visible)');
        expect(budget).not.toContain('env(safe-area-inset-bottom)');
    });
});
