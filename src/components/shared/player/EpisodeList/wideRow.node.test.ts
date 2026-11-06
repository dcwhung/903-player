// @vitest-environment node
// 闊橫版清單行收緊（wide list preview O3）：☆ 細啲、☆ 同 ▷ 貼近、狀態「聽到 33:32 / 44:00」一行
// （跟實際字型量，唔靠估 em：CI 字型闊啲就斷咗行，W-697），短篇集名欄最多 40%、唔夠位先縮。
// 手機打橫同直版唔郁（☆ 40px、間距照舊）
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

    it('should size the status column from its real one-line width, whatever the font', () => {
        // inline-size container 會令 min-content 變 0：內頁闊橫版唔做 container，最少闊度跟內容
        const body = cssDeclarations(css, '.body', WIDE_BANNER_QUERY);
        expect(body['container-type']).toBe('normal');
        expect(body['min-width']).toBe('min-content');
        expect(cssDeclarations(css, '.timedLine', WIDE_BANNER_QUERY)['flex-wrap']).toBe('nowrap');
        expect(cssDeclarations(tokens, ':root')['--episode-status-min']).toBeUndefined();
    });

    it('should come after the base rules it overrides (same specificity, later wins)', () => {
        const wide = css.indexOf(`@media ${WIDE_BANNER_QUERY}`);
        expect(wide).toBeGreaterThan(css.lastIndexOf('\n.timedLine {'));
        expect(wide).toBeGreaterThan(css.lastIndexOf('\n.body {'));
        expect(wide).toBeGreaterThan(css.lastIndexOf("\n[data-labels='title'] .date {"));
    });

    it('should let the short-drama title column give way, down to about 3.6 characters', () => {
        const title = cssDeclarations(css, "[data-labels='title'] .date", WIDE_BANNER_QUERY);
        expect(title.flex).toBe('0 1 var(--episode-label-title)');
        expect(title.width).toBe('auto');
        expect(title['min-width']).toBe('var(--episode-label-title-min)');
        expect(cssDeclarations(tokens, ':root')['--episode-label-title-min']).toBe(
            'calc(var(--font-size-md) * 3.6)',
        );
    });
});

// 主頁闊橫版播放卡（36% 闊，EpisodeList variant="card"）：成句狀態一行會逼走行尾 ▷，卡入面狀態可以換行
// （時間成段落第二行），最少闊度 = 時間一行（min-content，跟實際字型）；有快將下架嘅行照舊 container
// （LE1 窄欄短標籤），最少放得落時間（--episode-time-min）
describe('home card episode rows', () => {
    it('should let the status wrap but keep the time on one line inside the narrow home card', () => {
        expect(
            cssDeclarations(css, "[data-variant='card'] .timedLine", WIDE_BANNER_QUERY)[
                'flex-wrap'
            ],
        ).toBe('wrap');
        expect(cssDeclarations(css, "[data-variant='card'] .body", WIDE_BANNER_QUERY)).toEqual({});
    });

    it('should keep the LE1 container on leaving rows, sized for the time', () => {
        const leaving = cssDeclarations(
            css,
            "[data-variant='card'] .body:has(.leaving)",
            WIDE_BANNER_QUERY,
        );
        expect(leaving['container-type']).toBe('inline-size');
        expect(leaving['min-width']).toBe('var(--episode-time-min)');
        expect(cssDeclarations(tokens, ':root')['--episode-time-min']).toBe(
            'calc(var(--font-size-xs) * 6.4)',
        );
        expect(cssDeclarations(homeCard, '.episodes')['--episode-status-min']).toBeUndefined();
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
