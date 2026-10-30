// @vitest-environment node
// 要用 node:fs 讀 CSS 原文：*.node.test.ts 行 tsconfig.node.json（有 Node 型別），唔會漏入 app 程式
import { cssDeclarations, readCss } from '../../tests/cssRule';
import { FILL_SPACING_PX, FILL_SPACING_TOKENS } from '../components/HomeLandscapeGrid/fillSpacing';

const tokens = cssDeclarations(readCss(new URL('./tokens.css', import.meta.url)), ':root');

/** 跟 var() 搵到 `calc(Npx * var(--ui-scale))`，返回 N（未乘 --ui-scale 嘅 px） */
const basePx = (token: string): number => {
    const value = tokens[token] ?? '';
    const alias = /^var\((--[\w-]+)\)$/.exec(value);
    if (alias?.[1]) return basePx(alias[1]);
    return Number(/^calc\((\d+(?:\.\d+)?)px \* var\(--ui-scale\)\)$/.exec(value)?.[1]);
};

describe('fill grid spacing', () => {
    it.each(Object.entries(FILL_SPACING_TOKENS))(
        'should keep %s in step with %s in tokens.css',
        (key, token) => {
            expect(FILL_SPACING_PX[key as keyof typeof FILL_SPACING_PX]).toBe(basePx(token));
        },
    );
});
