// @vitest-environment node
// 要用 node:fs 讀 CSS 原文：*.node.test.ts 行 tsconfig.node.json（有 Node 型別），唔會漏入 app 程式
import { cssDeclarations, readCss } from '../../../tests/cssRule';

const cardCss = readCss(new URL('./HomePlayerCard.module.css', import.meta.url));
const tokens = cssDeclarations(
    readCss(new URL('../../styles/tokens.css', import.meta.url)),
    ':root',
);

const VAR = /var\((--[\w-]+)\)/g;
const UI_SCALE = 'var(--ui-scale)';

/** var(--x) 換做 tokens.css :root 嘅值（直版 --ui-scale = 1），`calc(8px * 1)` 收返做 `8px` */
const resolve = (value: string | undefined): string => {
    let text = value ?? '';
    while (text.includes('var(--')) {
        text = text.replace(VAR, (_, name: string) => tokens[name] ?? name);
    }
    return text.replace(/calc\((\d+px) \* 1\)/g, '$1');
};

describe('播放卡頁頭今日 / 重溫標籤（3a）', () => {
    const tag = cssDeclarations(cardCss, '.tag');

    it('should size the pill with tokens instead of hardcoded px', () => {
        expect(tag.padding).not.toMatch(/\dpx/);
        expect(tag['line-height']).not.toMatch(/\dpx/);
    });

    // 橫版大畫面 --ui-scale 1.3 / 1.5 會放大字：行高同上下內邊要一齊放大，唔係字會頂住膠囊邊
    it('should scale the line height and block padding with --ui-scale', () => {
        expect(tag['line-height']).toContain(UI_SCALE);
        // padding 第一個值（上下）：calc(<token> * var(--ui-scale))
        expect(tag.padding).toMatch(/^calc\(var\(--[\w-]+\) \* var\(--ui-scale\)\) /);
    });

    it('should keep breathing room around the text at the base scale', () => {
        expect(resolve(tag.padding)).toBe('2px 8px');
        expect(resolve(tag['line-height'])).toBe('16px');
    });
});
