// @vitest-environment node
// 收藏 tab / 清單細碟執位（用戶 iPhone 截圖，v1.28.1）：要讀 CSS 原文，見 tests/cssRule
import { cssDeclarations, readCss } from '../../../../../tests/cssRule';

const css = readCss(new URL('./SavedTab.module.css', import.meta.url));
const disc = readCss(new URL('../../../shared/common/Disc/Disc.module.css', import.meta.url));
const tokens = readCss(new URL('../../../../styles/tokens.css', import.meta.url));
const today = readCss(
    new URL('../../today/TodayShowList/TodayShowList.module.css', import.meta.url),
);
const episodes = readCss(
    new URL('../../../shared/player/EpisodeList/EpisodeList.module.css', import.meta.url),
);

describe('saved / list disc polish', () => {
    // 1a：最近收聽行嘅掣 overflow: hidden 剪走碟左邊外圈：掣左邊留返一圈外圈位
    it('should keep the recent row disc ring inside the row button', () => {
        expect(cssDeclarations(css, '.recentOpen').padding).toBe(
            'var(--space-1) 0 var(--space-1) var(--disc-small-ring)',
        );
        // 碟同文字起點照同收藏段對齊：panel 左邊留白扣返框粗幼同外圈
        expect(cssDeclarations(css, '.recent')['padding-left']).toBe(
            'calc(var(--space-3) - var(--saved-recent-border) - var(--disc-small-ring))',
        );
    });

    // 1b：收藏 / 最近收聽嘅碟同清單細碟一樣（Disc size="small"：幼身、平均嘅灰圈），唔再自己畫深色厚圈 + 落影
    it('should reuse the list disc look instead of a custom ring and drop shadow', () => {
        expect(css).not.toContain('--disc-fill-shadow');
        expect(tokens).not.toContain('--saved-disc-shadow');
        expect(disc).not.toMatch(/^\.fill\b/m);
        expect(cssDeclarations(disc, '.small').width).toBe(
            'var(--disc-small-size, calc(40px * var(--ui-scale)))',
        );
        expect(cssDeclarations(disc, '.small')['box-shadow']).toBe(
            '0 0 0 var(--disc-small-ring) var(--color-divider)',
        );
        expect(cssDeclarations(css, '.disc')['--disc-small-size']).toBe('var(--saved-disc)');
        expect(cssDeclarations(css, '.recentDisc')['--disc-small-size']).toBe('var(--saved-disc)');
    });

    // 2a：highlight 行嘅碟 / 日子唔好貼住行左邊：今日節目表、集數清單共用一個左邊留白
    it('should give highlighted list rows the same start padding', () => {
        expect(tokens).toContain('--list-row-pad-start:');
        expect(cssDeclarations(today, '.item').padding).toBe(
            '0 var(--space-2) 0 var(--list-row-pad-start)',
        );
        expect(cssDeclarations(episodes, '.row').padding).toBe(
            '0 var(--episode-row-pad-end) 0 var(--list-row-pad-start)',
        );
    });

    // 4：分欄之間用 padding 唔用 margin：WebKit 會將上一格嘅 margin-bottom 帶過下一欄頂，令第二欄矮咗
    it('should space the saved boxes with padding so every column starts at the top', () => {
        expect(cssDeclarations(css, '.boxItem')['margin-bottom']).toBeUndefined();
        expect(cssDeclarations(css, '.boxItem')['padding-bottom']).toBe('var(--saved-gap)');
    });

    // 用戶 iPhone 截圖（v1.28.1）：捲動條頂嗰截畀第一個 box 嘅 banner 遮住。banner 入面有定位元素
    // （.banner relative、圖 absolute、名 z-index: 1），捲動區自己唔係 stacking context，佢哋就畫喺
    // 外面嗰層、蓋過捲動區嘅 overlay 捲動條。捲動區自己開 stacking context，捲動條先畫喺內容上面
    it.each(['.scroll', '.recentScroll'])(
        'should paint %s content below its own scrollbar (own stacking context)',
        (selector) => {
            expect(cssDeclarations(css, selector).isolation).toBe('isolate');
        },
    );

    // 左滑到盡：紅底右邊係直角（行剪咗左邊圓角，紅底自己冇圓角）；紅底同行用同一個圓角 token
    it('should round every corner of the swipe trash like the row', () => {
        expect(cssDeclarations(css, '.row')['border-radius']).toBe('var(--radius-row)');
        expect(cssDeclarations(css, '.trash')['border-radius']).toBe('var(--radius-row)');
        // 行圓角保持原本 8px（以前寫 var(--space-2)），唔好順手改大
        expect(cssDeclarations(tokens, ':root')['--radius-row']).toBe(
            'calc(8px * var(--ui-scale))',
        );
    });

    // 用戶截圖（v1.28.2，闊橫版收藏 tab）：播緊嗰行唔再有深色底框；字色用嗰個節目 / 劇嘅主題色
    // （SavedRow inline --saved-row-accent），同上面短篇名（cream）分得開
    it('should drop the playing row box and colour its text with the row theme colour', () => {
        expect(cssDeclarations(css, ".row[data-playing='true'] .card").background).toBeUndefined();
        expect(tokens).not.toContain('--saved-box-playing-bg');
        expect(
            cssDeclarations(
                css,
                ".row[data-playing='true'] .label, .row[data-playing='true'] .state",
            ).color,
        ).toBe('var(--saved-row-accent, var(--color-gold))');
    });
});

/** F（用戶決定，saved banner preview + 半行）：收藏 box banner 高多半行（所有版面），中間裁唔變 */
describe('saved banner half a row taller', () => {
    it('should derive one saved row height from the row paddings and the ▷ size', () => {
        expect(tokens).toContain('--saved-row-pad-bottom: calc(9px * var(--ui-scale));');
        expect(tokens).toContain(
            '--saved-row-height: calc(var(--space-2) + var(--saved-row-pad-bottom) + var(--saved-play-size));',
        );
        expect(cssDeclarations(css, '.card').padding).toBe(
            'var(--space-2) 0 var(--saved-row-pad-bottom)',
        );
    });

    it('should make every banner half a row taller than the base banner height', () => {
        expect(tokens).toContain(
            '--saved-banner-tall: calc(var(--saved-banner-height) + var(--saved-row-height) / 2);',
        );
        expect(cssDeclarations(css, '.banner').height).toBe('var(--saved-banner-tall)');
    });

    it('should use the taller banner as the solo lower bound', () => {
        expect(cssDeclarations(css, ".saved[data-solo='true'] .banner")).toMatchObject({
            'min-height': 'var(--saved-banner-tall)',
            'max-height': 'max(var(--saved-banner-tall), var(--saved-solo-room, 0px))',
        });
    });
});
