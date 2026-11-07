// @vitest-environment node
// 放喺 scripts/：要用 node:fs 讀 CSS（見 launchThemeTokens.test.ts）
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { NEUTRAL_THEME } from '../src/config/showThemes';

const readToken = (css: string, name: string) =>
    new RegExp(`--${name}:\\s*(#[0-9a-f]{3,8})\\s*;`, 'i').exec(css)?.[1];

describe('blank disc tokens vs NEUTRAL_THEME', () => {
    // 冇圖嘅黑碟（今日冇節目、廣播劇未載入）唔跟頁面主題，要同中性主題一樣黑（CUI-0006）
    it('should paint the art-less disc and rim in the neutral colours', () => {
        const tokensPath = fileURLToPath(new URL('../src/styles/tokens.css', import.meta.url));
        const tokensCss = readFileSync(tokensPath, 'utf8');

        expect(readToken(tokensCss, 'color-disc-blank')).toBe(NEUTRAL_THEME.shadowDark);
        expect(readToken(tokensCss, 'color-disc-blank-rim')).toBe(NEUTRAL_THEME.surface);
    });
});
