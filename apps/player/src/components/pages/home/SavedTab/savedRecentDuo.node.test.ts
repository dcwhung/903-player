// @vitest-environment node
// iPhone Duo 闔上・直（P10 lane 2，_mockups_/iphone-duo）：「最近收聽」高度跟內容，最高 200px，
// 而且唔超過分頁區 40%，收藏區一定高過佢。只限 Duo 闔上・直，其他裝置照舊固定 200px。
import { cssDeclarations, readCss } from '../../../../../tests/cssRule';
import { DUO_COVER_PORTRAIT_QUERY } from '../../../../config/layout';

const css = readCss(new URL('./SavedTab.module.css', import.meta.url));
/** 有收藏版嘅最近收聽（冇收藏版 data-fill 照舊佔滿成個 tab，唔受影響） */
const RECENT = ".recent:not([data-fill='true'])";

describe('saved tab recent panel on Duo cover portrait', () => {
    it('should keep the fixed height everywhere else', () => {
        expect(cssDeclarations(css, '.recent').height).toBe('var(--saved-recent-height)');
    });

    it('should size to its content, capped at the usual height and 40% of the tab', () => {
        const duo = cssDeclarations(css, RECENT, DUO_COVER_PORTRAIT_QUERY);

        expect(duo.height).toBe('auto');
        expect(duo['max-height']).toBe('min(var(--saved-recent-height), 40%)');
    });

    it('should let the list take its content height and shrink under the cap', () => {
        // 預設 flex: 1 1 0 喺 height: auto 嘅格入面會縮到 0
        expect(cssDeclarations(css, `${RECENT} .recentScroll`, DUO_COVER_PORTRAIT_QUERY).flex).toBe(
            '0 1 auto',
        );
    });
});
