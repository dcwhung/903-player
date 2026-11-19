// @vitest-environment node
// iPhone Duo 闔上・橫（DUO_COVER_LANDSCAPE_QUERY，P10 v2.0.1 用戶反饋截圖 24）：左欄窄，
// 頁面集數清單（variant page）每行唔出收藏掣（☆ 同佢留嘅位），狀態字攞返個位唔使斷行；
// 收藏照用播放器嘅 ☆。只限呢個姿勢：其他裝置 / 主頁播放卡（variant card）唔郁
import { atRuleSelectors, cssDeclarations, readCss } from '../../../../../tests/cssRule';
import { DUO_COVER_LANDSCAPE_QUERY } from '../../../../config/layout';

const css = readCss(new URL('./EpisodeList.module.css', import.meta.url));
const SLOT = "[data-variant='page'] .bookmarkSpace";
const STAR = "[data-variant='page'] .item > .bookmark";

describe('Duo cover landscape episode rows', () => {
    it('should drop the bookmark star and its slot from page list rows', () => {
        expect(cssDeclarations(css, SLOT, DUO_COVER_LANDSCAPE_QUERY).display).toBe('none');
        expect(cssDeclarations(css, STAR, DUO_COVER_LANDSCAPE_QUERY).display).toBe('none');
    });

    it('should only hide them in that posture', () => {
        expect(atRuleSelectors(css, `@media ${DUO_COVER_LANDSCAPE_QUERY}`)).toEqual([SLOT, STAR]);
        expect(cssDeclarations(css, '.bookmarkSpace').display).toBeUndefined();
        expect(cssDeclarations(css, '.item > .bookmark').display).toBeUndefined();
    });
});
