import type { PlayerItem } from '../../types/playerItem';
import { cardFace, cardMotion, sameCardFace } from './cardMotion';

const BADGIRL: PlayerItem = { kind: 'show', id: 'badgirl', date: '2026-10-19' };
const BADGIRL_OLD: PlayerItem = { kind: 'show', id: 'badgirl', date: '2026-10-16' };
const WANNI: PlayerItem = { kind: 'show', id: 'wanni', date: '2026-10-19' };
const CHISEE: PlayerItem = { kind: 'drama', id: 'chisee' };
const JIM: PlayerItem = { kind: 'drama', id: 'jim' };

describe('cardFace', () => {
    it('should keep only the show / drama, not the date of a show', () => {
        expect(sameCardFace(cardFace('split', BADGIRL), cardFace('split', BADGIRL_OLD))).toBe(true);
    });

    it('should tell different modes or items apart', () => {
        expect(sameCardFace(cardFace('split', CHISEE), cardFace('fill', undefined))).toBe(false);
        expect(sameCardFace(cardFace('split', CHISEE), cardFace('split', JIM))).toBe(false);
    });
});

describe('cardMotion', () => {
    it.each([
        ['fill', 'split'],
        ['fillWithHandle', 'split'],
    ] as const)('should bring the card in when the layout goes %s → %s', (from, to) => {
        expect(cardMotion(cardFace(from, undefined), cardFace(to, CHISEE))).toBe('open');
    });

    it.each([
        ['split', 'fill'],
        ['split', 'fillWithHandle'],
        ['fill', 'fillWithHandle'],
        ['fillWithHandle', 'fill'],
    ] as const)('should not animate the card for %s → %s', (from, to) => {
        expect(cardMotion(cardFace(from, CHISEE), cardFace(to, undefined))).toBeNull();
    });

    it.each([
        ['another drama', CHISEE, JIM],
        ['a drama after a show', BADGIRL, CHISEE],
        ['a show after a drama', CHISEE, WANNI],
    ])('should flip the card when it switches to %s', (_, from, to) => {
        expect(cardMotion(cardFace('split', from), cardFace('split', to))).toBe('switch');
    });

    it.each([
        // 卡入面左右掃 / 撳指示點轉今日節目：唔反轉
        ['swiping between today’s shows', BADGIRL, WANNI],
        // 同一個節目另一集（例如卡入面集數清單）
        ['another episode of the same show', BADGIRL, BADGIRL_OLD],
        ['the same drama', CHISEE, CHISEE],
    ])('should not flip for %s', (_, from, to) => {
        expect(cardMotion(cardFace('split', from), cardFace('split', to))).toBeNull();
    });
});
