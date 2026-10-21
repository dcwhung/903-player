// @vitest-environment node
// 播放器唱片格（唱片 + 下面時間 / 播放掣嗰行）嘅比例只可以喺 tokens.css 定一次（S-013）
import { readdirSync } from 'node:fs';
import { cssDeclarations, readCss } from '../../tests/cssRule';

const SRC = new URL('../', import.meta.url);
const tokens = cssDeclarations(readCss(new URL('./tokens.css', import.meta.url)), ':root');
const GAUGE_ASPECT = 'var(--player-gauge-w) / var(--player-gauge-h)';

/** src 入面所有 CSS 檔（相對 src 嘅路徑） */
const cssFiles = (): string[] =>
    readdirSync(SRC, { recursive: true, encoding: 'utf8' }).filter((file) => file.endsWith('.css'));

describe('player gauge aspect ratio', () => {
    it('is defined once in tokens.css as 300 wide by 332 high', () => {
        expect(tokens['--player-gauge-w']).toBe('300');
        expect(tokens['--player-gauge-h']).toBe('332');
    });

    it.each([
        'components/PlayerPanel/PlayerPanel.module.css',
        'components/ShowCardStack/ShowCardStack.module.css',
        'components/TodayEmpty/TodayEmpty.module.css',
    ])('sizes .gauge in %s with the tokens', (file) => {
        const gauge = cssDeclarations(readCss(new URL(file, SRC)), '.gauge');

        expect(gauge['aspect-ratio']).toBe(GAUGE_ASPECT);
    });

    it('has no hardcoded 300 / 332 left in any CSS file', () => {
        const offenders = cssFiles().filter((file) =>
            /\b300\s*\/\s*332\b|\b332\s*\/\s*300\b/.test(readCss(new URL(file, SRC))),
        );

        expect(offenders).toEqual([]);
    });
});
