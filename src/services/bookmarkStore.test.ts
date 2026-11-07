import { act, renderHook } from '@testing-library/react';
import {
    BOOKMARK_STORAGE_KEY,
    BOOKMARK_STORE_VERSION,
    BOOKMARK_V1_STORAGE_KEY,
} from '../config/constants';
import type { SeriesEpisode, DailyEpisode } from '../types/drama';
import type { Recording } from '../types/recording';
import type { Track } from '../types/track';
import {
    addBookmark,
    bookmarkOf,
    hasBookmark,
    listBookmarks,
    mergeBookmarks,
    readLegacyBookmarks,
    removeBookmark,
    subscribeBookmarks,
    toggleBookmark,
    useBookmarks,
    useIsBookmarked,
} from './bookmarkStore';

const SHOW: Recording = {
    showId: 'gongzi',
    id: 'show:gongzi:2026-10-17',
    date: '2026-10-17',
    time: '2300',
    url: 'https://audio.hkfm903.live/gongzi-17.mp3',
};
const SERIES: SeriesEpisode = {
    kind: 'series',
    dramaId: 'lancy',
    id: 'drama:lancy:half:2',
    url: 'https://r2.example/lancy/half/02.mp3',
    arc: '戀愛二分一',
    no: 2,
    title: '第二次見面',
};
const DAILY: DailyEpisode = {
    kind: 'daily',
    dramaId: 'c18',
    id: 'drama:c18:2026-10-15',
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
            id: SHOW.id,
            url: SHOW.url,
            showId: 'gongzi',
            date: '2026-10-17',
            time: '2300',
            addedAt: NOW,
        });
        expect(bookmarkOf(SERIES, NOW)).toEqual({
            kind: 'series',
            id: SERIES.id,
            url: SERIES.url,
            dramaId: 'lancy',
            arc: '戀愛二分一',
            no: 2,
            title: '第二次見面',
            addedAt: NOW,
        });
        expect(bookmarkOf(DAILY, NOW)).toEqual({
            kind: 'daily',
            id: DAILY.id,
            url: DAILY.url,
            dramaId: 'c18',
            date: '2026-10-15',
            rerun: true,
            addedAt: NOW,
        });
    });

    it('should add, list, find and remove bookmarks by episode id', () => {
        addBookmark(SHOW, NOW);
        addBookmark(SERIES, NOW + 1);

        expect(listBookmarks().map((b) => b.id)).toEqual([SHOW.id, SERIES.id]);
        expect(hasBookmark(SERIES.id)).toBe(true);
        expect(hasBookmark(SERIES.url)).toBe(false);

        removeBookmark(SHOW.id);
        expect(hasBookmark(SHOW.id)).toBe(false);
        expect(listBookmarks()).toHaveLength(1);
    });

    it('should not add the same episode twice (keeps the first addedAt)', () => {
        addBookmark(SHOW, NOW);
        addBookmark(SHOW, NOW + 5);
        // 同一集換咗網址（例如搬 bucket）都係同一集
        addBookmark({ ...SHOW, url: 'https://new.example/gongzi.aac' }, NOW + 6);

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
            { ...bookmarkOf(DAILY, NOW), id: undefined },
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
        removeBookmark(SHOW.id);
        unsubscribe();
        addBookmark(SHOW, NOW);

        expect(listener).toHaveBeenCalledTimes(2);
    });

    it('should re-render hooks when a bookmark is added elsewhere', () => {
        const list = renderHook(() => useBookmarks());
        const one = renderHook(() => useIsBookmarked(SHOW.id));

        expect(list.result.current).toEqual([]);
        act(() => void addBookmark(SHOW, NOW));
        expect(list.result.current).toEqual([bookmarkOf(SHOW, NOW)]);
        expect(one.result.current).toBe(true);
    });

    it('should return the same list object until the store changes', () => {
        addBookmark(SHOW, NOW);

        expect(listBookmarks()).toBe(listBookmarks());
    });

    it('should store under the v2 key and leave v1 untouched', () => {
        localStorage.setItem(BOOKMARK_V1_STORAGE_KEY, 'old');
        addBookmark(SHOW, NOW);

        expect(BOOKMARK_STORAGE_KEY).toBe('903player:bookmarks:v2');
        expect(BOOKMARK_STORE_VERSION).toBe(2);
        expect(localStorage.getItem(BOOKMARK_V1_STORAGE_KEY)).toBe('old');
    });
});

describe('bookmarkStore migration helpers', () => {
    /** v1 格式：同 v2 一樣但冇 id */
    const legacyOf = (track: Track) =>
        Object.fromEntries(Object.entries(bookmarkOf(track, NOW)).filter(([key]) => key !== 'id'));
    const legacyShow = legacyOf(SHOW);
    const legacySeries = legacyOf(SERIES);

    const storedV1 = (version: number, items: unknown): void =>
        localStorage.setItem(BOOKMARK_V1_STORAGE_KEY, JSON.stringify({ version, items }));

    it('should read legacy v1 bookmarks (no id), dropping broken entries', () => {
        storedV1(1, [legacyShow, { kind: 'show', url: 'x' }, legacySeries, null]);

        expect(readLegacyBookmarks()).toEqual([legacyShow, legacySeries]);
    });

    it('should read nothing when v1 is missing, broken or another version', () => {
        expect(readLegacyBookmarks()).toEqual([]);
        storedV1(2, [legacyShow]);
        expect(readLegacyBookmarks()).toEqual([]);
        localStorage.setItem(BOOKMARK_V1_STORAGE_KEY, '{oops');
        expect(readLegacyBookmarks()).toEqual([]);
    });

    it('should append new ids only, keeping existing v2 bookmarks as they are', () => {
        addBookmark(SHOW, NOW + 9);

        const added = mergeBookmarks([bookmarkOf(SHOW, NOW), bookmarkOf(SERIES, NOW)]);

        expect(added).toBe(1);
        expect(listBookmarks()).toEqual([bookmarkOf(SHOW, NOW + 9), bookmarkOf(SERIES, NOW)]);
    });

    it('should not write or notify when nothing is new', () => {
        addBookmark(SHOW, NOW);
        const listener = vi.fn();
        const unsubscribe = subscribeBookmarks(listener);

        expect(mergeBookmarks([bookmarkOf(SHOW, NOW)])).toBe(0);
        expect(listener).not.toHaveBeenCalled();
        unsubscribe();
    });
});
