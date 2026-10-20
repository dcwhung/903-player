// @vitest-environment node
// 要用 node:fs 讀 CSS 原文：*.node.test.ts 行 tsconfig.node.json（有 Node 型別），唔會漏入 app 程式
import {
    atRuleDeclarations,
    atRuleSelectors,
    cssDeclarations,
    declarationsOutside,
    readCss,
} from '../../tests/cssRule';

const css = (path: string) => readCss(new URL(path, import.meta.url));

/*
 * 三個 @supports：公式（cqh 或 dvh 有一樣就用）、殼高 100cqh、殼高 100dvh（fallback）。
 * 殼高嗰兩個條件互相排斥，fallback 唔靠 source 先後蓋過。
 * prelude 要同 tokens.css 原文一樣（只係壓空白），例如 `(height: 1cqh)` 冒號後面有空格。
 */
const NO_CQH = '@supports not (height: 1cqh)';
const CQH = '@supports (height: 1cqh)';
const SIZED = '@supports (height: 1cqh) or (height: 100dvh)';

/*
 * W-390：iOS standalone PWA 嘅 dvh 可能同固定殼（html / body / #root 100%）高度對唔齊，
 * 主碟用 100dvh 計就可能大過殼預留嘅位，main.locked 又 overflow: hidden，清單 / 控制掣會畀人剪走。
 * 所以主碟要跟殼高（成頁 ThemeScope 嘅 size container → 100cqh），dvh 只留畀唔支援 cqh 嘅舊 iOS（< 16）。
 */
describe('player disc sizing source (W-390)', () => {
    it('should make the full-page theme scope a size container that fills the shell', () => {
        const scope = cssDeclarations(
            css('../components/ThemeScope/ThemeScope.module.css'),
            '.scope',
        );

        expect(scope).toMatchObject({ height: '100%', 'container-type': 'size' });
    });

    it('should size the disc from the shell height (100cqh), not the dynamic viewport', () => {
        const tokens = css('./tokens.css');
        const sized = atRuleDeclarations(tokens, SIZED, ':root');

        expect(atRuleSelectors(tokens, CQH)).toEqual([':root']);
        expect(atRuleDeclarations(tokens, CQH, ':root')).toEqual({
            '--player-shell-height': '100cqh',
        });
        expect(sized).not.toHaveProperty('--player-shell-height');
        expect(sized['--player-disc-size']).toContain('var(--player-shell-height)');
        expect(sized['--player-disc-size']).not.toMatch(/dvh\b/);
    });

    it('should only use dvh inside the fallback for browsers without cqh', () => {
        const tokens = css('./tokens.css');
        const dvhOutside = declarationsOutside(tokens, NO_CQH).filter((d) => /dvh\b/.test(d.value));

        expect(dvhOutside).toEqual([]);
        expect(atRuleDeclarations(tokens, NO_CQH, ':root')['--player-shell-height']).toBe('100dvh');
    });

    it('should keep the current dvh formula as the fallback (only the shell height source swaps)', () => {
        const tokens = css('./tokens.css');

        expect(atRuleSelectors(tokens, NO_CQH)).toEqual([':root']);
        expect(Object.keys(atRuleDeclarations(tokens, NO_CQH, ':root'))).toEqual([
            '--player-shell-height',
        ]);
    });
});
