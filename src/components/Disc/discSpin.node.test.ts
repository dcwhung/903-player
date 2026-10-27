// @vitest-environment node
// 要用 node:fs 讀 CSS 原文：*.node.test.ts 行 tsconfig.node.json（有 Node 型別），唔會漏入 app 程式
import { cssDeclarations, readCss } from '../../../tests/cssRule';

const disc = readCss(new URL('./Disc.module.css', import.meta.url));
const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

/*
 * 自轉規則寫喺 .face（大碟同細碟一樣），所以 mini player 嘅細碟傳 spinning 都會轉；
 * 一直掛住 paused 嘅 animation，停咗就停喺原位，唔會彈返 0°
 */
describe('disc spin', () => {
    it('should keep a paused spin on every disc face, large or small', () => {
        expect(cssDeclarations(disc, '.face').animation).toBe(
            'disc-spin var(--duration-disc-spin) linear infinite paused',
        );
        expect(cssDeclarations(disc, '.large .face').animation).toBeUndefined();
    });

    it('should run the spin only when spinning is passed', () => {
        expect(cssDeclarations(disc, '.face.spinning')['animation-play-state']).toBe('running');
    });

    it('should drop the spin while upright', () => {
        expect(cssDeclarations(disc, '.face.upright').animation).toBe('none');
    });

    it('should not spin any disc when the user asks for reduced motion', () => {
        expect(cssDeclarations(disc, '.face', REDUCED_MOTION).animation).toBe('none');
        expect(cssDeclarations(disc, '.large .face', REDUCED_MOTION).animation).toBeUndefined();
    });
});
