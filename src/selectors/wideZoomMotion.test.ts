import type { PlayerItem } from '../types/playerItem';
import type { InnerPage } from './pageHandle';
import {
    homeSideOf,
    wideBackMotion,
    wideTileMotion,
    type WideBackInput,
    type WideTileInput,
} from './wideZoomMotion';

const GONGZI: PlayerItem = { kind: 'show', id: 'gongzi', date: '2026-10-19' };
const BADGIRL: PlayerItem = { kind: 'show', id: 'badgirl', date: '2026-10-19' };
const CHISEE: PlayerItem = { kind: 'drama', id: 'chisee' };

const GONGZI_PAGE: InnerPage = { kind: 'show', showId: 'gongzi' };
const CHISEE_PAGE: InnerPage = { kind: 'drama', dramaId: 'chisee' };
const TODAY_PAGE: InnerPage = { kind: 'today', date: '2026-10-19' };

const tile = (overrides: Partial<WideTileInput>): WideTileInput => ({
    side: 'card',
    card: BADGIRL,
    page: GONGZI_PAGE,
    handle: false,
    ...overrides,
});

const back = (overrides: Partial<WideBackInput>): WideBackInput => ({
    zoomed: true,
    handle: false,
    side: 'card',
    ...overrides,
});

describe('homeSideOf', () => {
    it('should map each layout to what sits on the right of the home page', () => {
        expect(homeSideOf('split')).toBe('card');
        expect(homeSideOf('fillWithHandle')).toBe('handle');
        expect(homeSideOf('fill')).toBe('none');
        expect(homeSideOf('stack')).toBe('none');
    });
});

/** 闊橫版撳格入頁（_mockups_/card-zoom-wide） */
describe('wideTileMotion', () => {
    it('should expand the card when the tile opens the show already on the card', () => {
        expect(wideTileMotion(tile({ card: GONGZI }))).toBe('expand');
    });

    it('should expand the card when the tile opens the drama already on the card', () => {
        expect(wideTileMotion(tile({ card: CHISEE, page: CHISEE_PAGE }))).toBe('expand');
    });

    it('should zoom the today tile even when the card plays a today show (no player page to morph into)', () => {
        expect(wideTileMotion(tile({ card: GONGZI, page: TODAY_PAGE }))).toBe('zoom');
    });

    it('should pair the card with the inner handle when another show keeps the card (①)', () => {
        expect(wideTileMotion(tile({ handle: true }))).toBe('zoom-handle');
    });

    it('should pair the home handle with the inner handle when the closed card stays closed', () => {
        expect(wideTileMotion(tile({ side: 'handle', card: null, handle: true }))).toBe(
            'zoom-handle',
        );
    });

    it('should just zoom when the inner page will have no handle (②, ③)', () => {
        expect(wideTileMotion(tile({ side: 'none', card: null }))).toBe('zoom');
        expect(wideTileMotion(tile({ side: 'handle', card: null }))).toBe('zoom');
        expect(wideTileMotion(tile({ handle: false }))).toBe('zoom');
    });

    it('should just zoom when nothing on the home page can turn into the handle', () => {
        expect(wideTileMotion(tile({ side: 'none', card: null, handle: true }))).toBe('zoom');
    });
});

/** 闊橫版內頁返主頁 */
describe('wideBackMotion', () => {
    it('should shrink back into the card when the page was not zoomed from a tile', () => {
        expect(wideBackMotion(back({ zoomed: false }))).toBe('back');
        expect(wideBackMotion(back({ zoomed: false, handle: true }))).toBe('back');
        expect(wideBackMotion(back({ zoomed: false, side: 'handle' }))).toBe('back');
    });

    it('should unzoom while the inner handle grows back into the card (①)', () => {
        expect(wideBackMotion(back({ handle: true }))).toBe('unzoom-handle');
    });

    it('should unzoom while the inner handle turns back into the home handle', () => {
        expect(wideBackMotion(back({ handle: true, side: 'handle' }))).toBe('unzoom-handle');
    });

    it('should shrink the page into the card it will become without a handle (R2)', () => {
        expect(wideBackMotion(back({ handle: false, side: 'card' }))).toBe('back');
    });

    it('should only unzoom when the card stays closed (C1)', () => {
        expect(wideBackMotion(back({ handle: false, side: 'handle' }))).toBe('unzoom');
    });

    it('should only unzoom when the home page will have nothing on the right', () => {
        expect(wideBackMotion(back({ handle: false, side: 'none' }))).toBe('unzoom');
        expect(wideBackMotion(back({ handle: true, side: 'none' }))).toBe('unzoom');
    });
});
