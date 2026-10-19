// @vitest-environment node
// 放喺 scripts/：要用 node:fs 讀 CSS（Vitest 會將 CSS 連 ?raw 都處理成空字串），
// 而 Node 型別只屬 tsconfig.node.json，唔會漏入 app 程式（tsconfig.app.json）
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { CARD_FLY_MS, CARD_SPRING_MS } from '../src/components/ShowCardStack/cardStack';

const tokensCss = readFileSync(
    fileURLToPath(new URL('../src/styles/tokens.css', import.meta.url)),
    'utf8',
);

/** 讀 tokens.css 入面一個 ms 時間 token */
const durationMs = (name: string): number | undefined => {
    const match = new RegExp(`${name}:\\s*(\\d+)ms\\s*;`).exec(tokensCss);
    return match?.[1] === undefined ? undefined : Number(match[1]);
};

describe('card stack durations vs tokens.css', () => {
    // CSS transition 同 JS timer（飛走之後先轉節目、彈返之後先靜止）要一樣長
    it('should match CARD_FLY_MS', () => {
        expect(durationMs('--duration-card-fly')).toBe(CARD_FLY_MS);
    });

    it('should match CARD_SPRING_MS', () => {
        expect(durationMs('--duration-card-spring')).toBe(CARD_SPRING_MS);
    });
});
