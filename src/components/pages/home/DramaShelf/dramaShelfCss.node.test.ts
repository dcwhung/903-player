// @vitest-environment node
// 要用 node:fs 讀 CSS 原文：*.node.test.ts 行 tsconfig.node.json（有 Node 型別），唔會漏入 app 程式
import { cssDeclarations, readCss } from '../../../../../tests/cssRule';

const css = readCss(new URL('./DramaShelf.module.css', import.meta.url));

// 同一條頂行收字第 2 步（useHideWhenTight data-tight="2"）
const STEP_TWO = ".topBar:has(> .meta[data-tight='2'])";

describe('DramaShelf corner leaving date (E2, W-536)', () => {
    it('should hide both the full and the short leaving text at step 2, so only the bare date shows', () => {
        // 格闊 > 280px 時出緊嘅係全句（noteFull），第 2 步都要收，唔可以全句 + 日期一齊出
        expect(
            cssDeclarations(css, `${STEP_TWO} :is(.noteFull, .noteTag):has(~ .noteNarrow)`),
        ).toEqual({ display: 'none' });
        expect(cssDeclarations(css, `${STEP_TWO} .noteNarrow`)).toEqual({ display: 'inline' });
    });
});
