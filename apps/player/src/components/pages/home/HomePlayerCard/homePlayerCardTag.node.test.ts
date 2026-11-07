// @vitest-environment node
// 要用 node:fs 讀 CSS 原文：*.node.test.ts 行 tsconfig.node.json（有 Node 型別），唔會漏入 app 程式
import { cssDeclarations, readCss } from '../../../../../tests/cssRule';

const tokensCss = readCss(new URL('../../../../styles/tokens.css', import.meta.url));
const cardCss = readCss(new URL('./HomePlayerCard.module.css', import.meta.url));
const tokens = cssDeclarations(tokensCss, ':root');
const tag = cssDeclarations(cardCss, '.tag');

const VAR = /var\((--[\w-]+)\)/g;
/** 代入 token 之後最內層嘅 `calc(<px>px * <倍數>)` */
const PX_TIMES = /calc\(([\d.]+)px \* ([\d.]+)\)/g;
/** tokens.css 每個 --ui-scale 宣告（:root 預設 + 橫版 @media），將來加新倍數自動驗埋 */
const UI_SCALE_DECL = /--ui-scale:\s*([\d.]+);/g;
const UI_SCALES = [...tokensCss.matchAll(UI_SCALE_DECL)].map(([, scale]) => Number(scale));

/** var(--x) 換做 tokens.css 嘅值、--ui-scale 換做 scale，再計晒 calc，返回 px 數值（空格分隔多個值） */
const resolvePx = (value: string | undefined, scale: number): number[] => {
    let text = value ?? '';
    while (text.includes('var(--')) {
        text = text.replace(VAR, (_, name: string) =>
            name === '--ui-scale' ? String(scale) : (tokens[name] ?? name),
        );
    }
    // 計到冇嘢再變為止（唔用 /g regex 嘅 .test()：lastIndex 有狀態，易跳漏）
    for (let prev = ''; prev !== text;) {
        prev = text;
        text = text.replace(PX_TIMES, (_, px: string, k: string) => `${Number(px) * Number(k)}px`);
    }
    return text.split(' ').map((part) => parseFloat(part));
};

describe('播放卡頁頭今日 / 重溫標籤（3a）', () => {
    it('should size the pill with tokens instead of hardcoded px', () => {
        expect(tag.padding).not.toMatch(/\dpx/);
        expect(tag['line-height']).not.toMatch(/\dpx/);
        expect(tag['font-size']).not.toMatch(/\dpx/);
    });

    it('should read every --ui-scale from tokens.css (base + wide landscape)', () => {
        expect(UI_SCALES).toEqual(expect.arrayContaining([1, 1.3, 1.5]));
    });

    // 橫版大畫面 --ui-scale 放大字：行高唔可以細過字，上下要有內邊，唔係字頂住膠囊邊
    it.each(UI_SCALES)('should keep room around the text at --ui-scale %s', (scale) => {
        const [fontSize = Number.NaN] = resolvePx(tag['font-size'], scale);
        const [lineHeight = Number.NaN] = resolvePx(tag['line-height'], scale);
        const [padBlock = Number.NaN, padInline = Number.NaN] = resolvePx(tag.padding, scale);
        expect(lineHeight).toBeGreaterThanOrEqual(fontSize);
        expect(padBlock).toBeGreaterThan(0);
        expect(padInline).toBeGreaterThan(padBlock);
    });
});
