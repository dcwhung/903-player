import { act, renderHook } from '@testing-library/react';
import { BOOKMARK_STORAGE_KEY, BOOKMARK_STORE_VERSION } from '../config/constants';
import type { SeriesEpisode, DailyEpisode } from '../types/drama';
import type { Recording } from '../types/recording';
import {
    addBookmark,
    bookmarkOf,
    hasBookmark,
    listBookmarks,
    removeBookmark,
    subscribeBookmarks,
    toggleBookmark,
    useBookmarks,
    useIsBookmarked,
} from './bookmarkStore';

const SHOW: Recording = {
    showId: 'gongzi',
    date: '2026-10-17',
    time: '2300',
    url: 'https://audio.hkfm903.live/gongzi-17.mp3',
};
const SERIES: SeriesEpisode = {
    kind: 'series',
    dramaId: 'lancy',
    url: 'https://r2.example/lancy/half/02.mp3',
    arc: '戀愛二分一',
    no: 2,
    title: '第二次見面',
};
const DAILY: DailyEpisode = {
    kind: 'daily',
    dramaId: 'c18',
    url: 'https://r2.example/c18/2026-10-15.mp3',
    date: '2026-10-15',
    rerun: true,
};

const NOW = 1_700_000_000_000;

const stored = (items: unknown): void =>
    localStorage.setItem(
        BOOKMARK_STORAGE_KEY,
        JSON.stringify({ version: BOOKMARK_STORE_VERSION, items }),
    );

describe('bookmarkStore', () => {
    it('should keep the metadata of each kind so the saved tab works without the recording list', () => {
        expect(bookmarkOf(SHOW, NOW)).toEqual({
            kind: 'show',
            url: SHOW.url,
            showId: 'gongzi',
            date: '2026-10-17',
            time: '2300',
            addedAt: NOW,
        });
        expect(bookmarkOf(SERIES, NOW)).toEqual({
            kind: 'series',
            url: SERIES.url,
            dramaId: 'lancy',
            arc: '戀愛二分一',
            no: 2,
            title: '第二次見面',
            addedAt: NOW,
        });
        expect(bookmarkOf(DAILY, NOW)).toEqual({
            kind: 'daily',
            url: DAILY.url,
            dramaId: 'c18',
            date: '2026-10-15',
            rerun: true,
            addedAt: NOW,
        });
    });

    it('should add, list, find and remove bookmarks by audio URL', () => {
        addBookmark(SHOW, NOW);
        addBookmark(SERIES, NOW + 1);

        expect(listBookmarks().map((b) => b.url)).toEqual([SHOW.url, SERIES.url]);
        expect(hasBookmark(SERIES.url)).toBe(true);

        removeBookmark(SHOW.url);
        expect(hasBookmark(SHOW.url)).toBe(false);
        expect(listBookmarks()).toHaveLength(1);
    });

    it('should not add the same episode twice (keeps the first addedAt)', () => {
        addBookmark(SHOW, NOW);
        addBookmark(SHOW, NOW + 5);

        expect(listBookmarks()).toEqual([bookmarkOf(SHOW, NOW)]);
    });

    it('should toggle and report the new state', () => {
        expect(toggleBookmark(DAILY, NOW)).toBe(true);
        expect(toggleBookmark(DAILY, NOW)).toBe(false);
        expect(listBookmarks()).toEqual([]);
    });

    it('should save a versioned payload under its own key', () => {
        addBookmark(SHOW, NOW);

        expect(JSON.parse(localStorage.getItem(BOOKMARK_STORAGE_KEY) ?? '')).toEqual({
            version: BOOKMARK_STORE_VERSION,
            items: [bookmarkOf(SHOW, NOW)],
        });
    });

    it('should drop broken entries and ignore other versions or bad JSON', () => {
        stored([
            bookmarkOf(SHOW, NOW),
            { kind: 'show', url: 'x' },
            { kind: 'series', url: 'y', dramaId: 'lancy', arc: 'a', no: '2', addedAt: NOW },
            null,
            'nope',
        ]);
        expect(listBookmarks()).toEqual([bookmarkOf(SHOW, NOW)]);

        localStorage.setItem(
            BOOKMARK_STORAGE_KEY,
            JSON.stringify({ version: BOOKMARK_STORE_VERSION + 1, items: [bookmarkOf(SHOW, NOW)] }),
        );
        expect(listBookmarks()).toEqual([]);

        localStorage.setItem(BOOKMARK_STORAGE_KEY, '{oops');
        expect(listBookmarks()).toEqual([]);
    });

    it('should notify subscribers on every change', () => {
        const listener = vi.fn();
        const unsubscribe = subscribeBookmarks(listener);

        addBookmark(SHOW, NOW);
        removeBookmark(SHOW.url);
        unsubscribe();
        addBookmark(SHOW, NOW);

        expect(listener).toHaveBeenCalledTimes(2);
    });

    it('should re-render hooks when a bookmark is added elsewhere', () => {
        const list = renderHook(() => useBookmarks());
        const one = renderHook(() => useIsBookmarked(SHOW.url));

        expect(list.result.current).toEqual([]);
        act(() => void addBookmark(SHOW, NOW));
        expect(list.result.current).toEqual([bookmarkOf(SHOW, NOW)]);
        expect(one.result.current).toBe(true);
    });

    it('should return the same list object until the store changes', () => {
        addBookmark(SHOW, NOW);

        expect(listBookmarks()).toBe(listBookmarks());
    });
});
