// @vitest-environment node
// 闊橫版清單行收緊（wide list preview O3）：☆ 細啲、☆ 同 ▷ 貼近、狀態欄最少 8.75em（「聽到 33:32 / 44:00」一行），
// 短篇集名欄最多 40%、唔夠位先縮。手機打橫同直版唔郁（☆ 40px、間距照舊）
import { cssDeclarations, readCss } from '../../../../../tests/cssRule';
import { SHORT_LANDSCAPE_QUERY, WIDE_BANNER_QUERY } from '../../../../config/layout';

const css = readCss(new URL('./EpisodeList.module.css', import.meta.url));
const tokens = readCss(new URL('../../../../styles/tokens.css', import.meta.url));
const homeCard = readCss(
    new URL('../../../pages/home/HomePlayerCard/HomePlayerCard.module.css', import.meta.url),
);

describe('wide landscape episode rows', () => {
    it('should shrink the bookmark slot and the gap before the play icon', () => {
        const section = cssDeclarations(css, '.section', WIDE_BANNER_QUERY);
        expect(section['--episode-bookmark-size']).toBe('calc(32px * var(--ui-scale))');
        expect(section['--episode-icon-gap']).toBe('calc(4px * var(--ui-scale))');
    });

    it('should keep the status column wide enough for one line of 聽到 x / y', () => {
        expect(cssDeclarations(tokens, ':root')['--episode-status-min']).toBe(
            'calc(var(--font-size-xs) * 8.75)',
        );
        expect(cssDeclarations(css, '.section', WIDE_BANNER_QUERY)['--episode-status-min']).toBe(
            undefined,
        );
        expect(cssDeclarations(css, '.body', WIDE_BANNER_QUERY)['min-width']).toBe(
            'var(--episode-status-min)',
        );
    });

    it('should let the short-drama title column give way, down to about 3.6 characters', () => {
        const title = cssDeclarations(css, "[data-labels='title'] .date", WIDE_BANNER_QUERY);
        expect(title.flex).toBe('0 1 var(--episode-label-title)');
        expect(title.width).toBe('auto');
        expect(title['min-width']).toBe('calc(var(--font-size-md) * 3.6)');
    });
});

// 主頁闊橫版播放卡（36% 闊）：成句狀態最少闊度會逼走行尾 ▷，卡入面淨係保證時間「33:32 / 44:00」一行
describe('home card episode rows', () => {
    it('should only keep the time on one line inside the narrow home card', () => {
        expect(cssDeclarations(homeCard, '.episodes')['--episode-status-min']).toBe(
            'calc(var(--font-size-xs) * 6.4)',
        );
    });
});

describe('episode row icon gap', () => {
    it('should place the star one icon gap left of the play icon', () => {
        expect(cssDeclarations(css, '.bookmarkSpace')['margin-right']).toBe(
            'calc(var(--episode-icon-gap) - var(--episode-row-gap))',
        );
        expect(cssDeclarations(css, '.item > .bookmark').right).toBe(
            'calc(var(--episode-row-pad-end) + var(--episode-row-icon) + var(--episode-icon-gap))',
        );
    });

    it('should default the icon gap to the row gap so phones keep the current spacing', () => {
        expect(cssDeclarations(css, '.section')['--episode-icon-gap']).toBe(
            'var(--episode-row-gap)',
        );
        expect(cssDeclarations(css, '.section', SHORT_LANDSCAPE_QUERY)).toEqual({});
    });
});
