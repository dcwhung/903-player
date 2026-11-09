import type { DailyEpisode, SeriesEpisode } from '@903-player/catalog';
import { catalogEpisodesOf, dramaEpisodesOf } from '../catalog/dramas';
import { findShow } from '../catalog/shows';
import {
    BOOKMARK_MIGRATED_STORAGE_KEY,
    BOOKMARK_STORAGE_KEY,
    BOOKMARK_V1_STORAGE_KEY,
    PROGRESS_STORAGE_KEY,
    PROGRESS_V1_STORAGE_KEY,
} from '../config/constants';
import { buildAudioUrl } from './audioProbe';
import { listBookmarks, removeBookmark } from './bookmarkStore';
import { writeProbeState } from './probeStore';
import { getProgress, getProgressMap, saveProgress, type Progress } from './progressStore';
import { catalogUrlIndex, migrateStorage } from './storageMigration';

/*
 * Edge cases：v1 唔存在 / 壞 JSON / 非 object；對到 / 對唔到；v2 已有同 key；重跑；
 * 已下架 / 未上架 / 停用劇集數；probe store 錄音；probe store 冇嘅節目錄音 URL；
 * 收藏 show / daily / series；喺 v2 移除咗嘅收藏唔會復活；storage 出錯唔 throw
 */

const NOW = 1_700_000_000_000;
const SAVED: Progress = { position: 120, duration: 1800, watched: false, updatedAt: NOW };
const WATCHED: Progress = { position: 1790, duration: 1800, watched: true, updatedAt: NOW };

const seriesOf = (dramaId: string): SeriesEpisode[] =>
    catalogEpisodesOf(dramaId).filter((e): e is SeriesEpisode => e.kind === 'series');
const firstLancy = (): SeriesEpisode => seriesOf('lancy')[0] as SeriesEpisode;
const lastChisee = (): SeriesEpisode => seriesOf('chisee').at(-1) as SeriesEpisode;
const firstC18 = (): DailyEpisode => catalogEpisodesOf('c18')[0] as DailyEpisode;
const BADGIRL_URL = buildAudioUrl(findShow('badgirl')!, '2026-10-19');
const UNKNOWN_URL = 'https://pub-1f26dbd9526e41b89de51bd33054d825.r2.dev/gone/old.m4a';

const setV1Progress = (map: Record<string, unknown>): void =>
    localStorage.setItem(PROGRESS_V1_STORAGE_KEY, JSON.stringify(map));
const setV1Bookmarks = (items: unknown[]): void =>
    localStorage.setItem(BOOKMARK_V1_STORAGE_KEY, JSON.stringify({ version: 1, items }));

describe('migrateStorage — progress v1 → v2', () => {
    it('should do nothing (and not throw) when there is no v1 data', () => {
        expect(() => migrateStorage()).not.toThrow();
        expect(localStorage.getItem(PROGRESS_STORAGE_KEY)).toBeNull();
        expect(localStorage.getItem(BOOKMARK_STORAGE_KEY)).toBeNull();
    });

    it.each([
        ['broken JSON', '{oops'],
        ['a JSON array', '[1,2]'],
        ['JSON null', 'null'],
        ['a JSON string', '"x"'],
    ])('should survive v1 progress that is %s', (_label, raw) => {
        localStorage.setItem(PROGRESS_V1_STORAGE_KEY, raw);
        localStorage.setItem(BOOKMARK_V1_STORAGE_KEY, raw);

        expect(() => migrateStorage()).not.toThrow();
        expect(getProgressMap()).toEqual({});
    });

    it('should move drama progress to its episode id and keep v1 untouched', () => {
        const raw = JSON.stringify({ [firstLancy().url]: SAVED, [lastChisee().url]: WATCHED });
        localStorage.setItem(PROGRESS_V1_STORAGE_KEY, raw);

        migrateStorage();

        expect(getProgress('drama:lancy:half:1')).toEqual(SAVED);
        expect(getProgress(lastChisee().id)).toEqual(WATCHED);
        expect(localStorage.getItem(PROGRESS_V1_STORAGE_KEY)).toBe(raw);
    });

    it('should cover episodes of disabled dramas (c18) and arcs not yet released', () => {
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(new Date('2026-10-01T04:00:00Z'));
        // 三十六計 2026-10-24 先上架
        const upcoming = seriesOf('chisee')[0] as SeriesEpisode;
        expect(dramaEpisodesOf('chisee').some((e) => e.id === upcoming.id)).toBe(false);
        setV1Progress({ [firstC18().url]: SAVED, [upcoming.url]: SAVED });

        migrateStorage();
        vi.useRealTimers();

        expect(getProgress(firstC18().id)).toEqual(SAVED);
        expect(getProgress('drama:chisee:36-stratagems:1')).toEqual(SAVED);
    });

    it('should map show recordings from the probe store', () => {
        const url = 'https://audio.hkfm903.live/x/y.aac';
        const cached = { showId: 'badgirl', date: '2026-10-18', time: '1009', url };
        writeProbeState({ found: [{ ...cached, id: 'show:badgirl:2026-10-18' }], misses: {} });
        setV1Progress({ [url]: SAVED });

        migrateStorage();

        expect(getProgress('show:badgirl:2026-10-18')).toEqual(SAVED);
    });

    it('should map show recordings the probe store no longer has, from the url itself', () => {
        setV1Progress({ [BADGIRL_URL]: WATCHED });

        migrateStorage();

        expect(getProgress('show:badgirl:2026-10-19')).toEqual(WATCHED);
    });

    it('should leave unknown urls in v1 only, and pick them up once they can be mapped', () => {
        setV1Progress({ [UNKNOWN_URL]: SAVED, [BADGIRL_URL]: SAVED });

        migrateStorage();

        expect(Object.keys(getProgressMap())).toEqual(['show:badgirl:2026-10-19']);
        expect(JSON.parse(localStorage.getItem(PROGRESS_V1_STORAGE_KEY) ?? '')).toHaveProperty([
            UNKNOWN_URL,
        ]);
        migrateStorage({ index: new Map([[UNKNOWN_URL, 'drama:gone:arc:1']]) });
        expect(getProgress('drama:gone:arc:1')).toEqual(SAVED);
    });

    it('should not overwrite progress the new version already saved, even on reruns', () => {
        saveProgress('drama:lancy:half:1', 5, 1800);
        setV1Progress({ [firstLancy().url]: WATCHED });

        migrateStorage();
        migrateStorage();

        expect(getProgress('drama:lancy:half:1')?.position).toBe(5);
    });

    it('should be idempotent: running twice gives the same v2 data', () => {
        setV1Progress({ [firstLancy().url]: SAVED, [BADGIRL_URL]: WATCHED });

        migrateStorage();
        const once = localStorage.getItem(PROGRESS_STORAGE_KEY);
        migrateStorage();

        expect(localStorage.getItem(PROGRESS_STORAGE_KEY)).toBe(once);
    });

    it('should skip v1 entries with a broken shape', () => {
        setV1Progress({ [firstLancy().url]: { position: 'x' } });

        migrateStorage();

        expect(getProgressMap()).toEqual({});
    });

    it('should not throw when localStorage itself fails', () => {
        setV1Progress({ [firstLancy().url]: SAVED });
        const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
            throw new Error('denied');
        });

        expect(() => migrateStorage()).not.toThrow();
        spy.mockRestore();
    });
});

describe('migrateStorage — bookmarks v1 → v2', () => {
    const showV1 = {
        kind: 'show',
        url: BADGIRL_URL,
        showId: 'badgirl',
        date: '2026-10-19',
        time: '1009',
        addedAt: NOW,
    };
    const seriesV1 = () => ({
        kind: 'series',
        url: firstLancy().url,
        dramaId: 'lancy',
        arc: firstLancy().arc,
        no: 1,
        addedAt: NOW + 1,
    });
    const dailyV1 = () => ({
        kind: 'daily',
        url: firstC18().url,
        dramaId: 'c18',
        date: firstC18().date,
        rerun: false,
        addedAt: NOW + 2,
    });

    it('should add the episode id to show, series and daily bookmarks, keeping v1', () => {
        setV1Bookmarks([showV1, seriesV1(), dailyV1()]);
        const raw = localStorage.getItem(BOOKMARK_V1_STORAGE_KEY);

        migrateStorage();

        expect(listBookmarks()).toEqual([
            { ...showV1, id: 'show:badgirl:2026-10-19' },
            { ...seriesV1(), id: 'drama:lancy:half:1' },
            { ...dailyV1(), id: firstC18().id },
        ]);
        expect(localStorage.getItem(BOOKMARK_V1_STORAGE_KEY)).toBe(raw);
    });

    it('should derive the id from the bookmark fields when the url is unknown', () => {
        const movedShow = { ...showV1, url: 'https://audio.hkfm903.live/old/name.aac' };
        const movedSeries = { ...seriesV1(), url: UNKNOWN_URL };
        setV1Bookmarks([movedShow, movedSeries]);

        migrateStorage();

        expect(listBookmarks().map((b) => b.id)).toEqual([
            'show:badgirl:2026-10-19',
            'drama:lancy:half:1',
        ]);
    });

    it('should leave a series bookmark whose arc no longer exists in v1 only', () => {
        setV1Bookmarks([{ ...seriesV1(), url: UNKNOWN_URL, arc: '冇咗嘅短篇' }]);

        migrateStorage();

        expect(listBookmarks()).toEqual([]);
        expect(localStorage.getItem(BOOKMARK_MIGRATED_STORAGE_KEY)).toBeNull();
    });

    it('should not bring back a bookmark the user removed after it was migrated', () => {
        setV1Bookmarks([showV1, seriesV1()]);
        migrateStorage();

        removeBookmark('show:badgirl:2026-10-19');
        migrateStorage();

        expect(listBookmarks().map((b) => b.id)).toEqual(['drama:lancy:half:1']);
    });

    it('should retry on the next launch when the v2 write fails (W-698)', () => {
        setV1Bookmarks([showV1]);
        const original = Storage.prototype.setItem;
        const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (
            this: Storage,
            key: string,
            value: string,
        ) {
            if (key === BOOKMARK_STORAGE_KEY) throw new DOMException('full', 'QuotaExceededError');
            original.call(this, key, value);
        });

        migrateStorage();
        spy.mockRestore();
        expect(listBookmarks()).toEqual([]);
        expect(localStorage.getItem(BOOKMARK_MIGRATED_STORAGE_KEY)).toBeNull();

        migrateStorage();
        expect(listBookmarks().map((b) => b.id)).toEqual(['show:badgirl:2026-10-19']);
    });

    it('should migrate bookmarks added to v1 later (e.g. after a rollback)', () => {
        setV1Bookmarks([showV1]);
        migrateStorage();

        setV1Bookmarks([showV1, seriesV1()]);
        migrateStorage();

        expect(listBookmarks().map((b) => b.id)).toEqual([
            'show:badgirl:2026-10-19',
            'drama:lancy:half:1',
        ]);
    });

    it('should keep a v2 bookmark of the same episode as it is', () => {
        setV1Bookmarks([showV1]);
        localStorage.setItem(
            BOOKMARK_STORAGE_KEY,
            JSON.stringify({
                version: 2,
                items: [{ ...showV1, id: 'show:badgirl:2026-10-19', addedAt: NOW + 9 }],
            }),
        );

        migrateStorage();
        migrateStorage();

        expect(listBookmarks()).toEqual([
            { ...showV1, id: 'show:badgirl:2026-10-19', addedAt: NOW + 9 },
        ]);
    });
});

describe('catalogUrlIndex', () => {
    it('should include removed episodes as well as live ones', () => {
        const removed = { ...firstLancy(), url: 'https://x/removed.m4a', removedAt: '2000-01-01' };

        const index = catalogUrlIndex([removed], []);

        expect(index.get('https://x/removed.m4a')).toBe(removed.id);
    });

    it('should cover every episode of every drama in the bundled catalog by default', () => {
        const index = catalogUrlIndex();

        expect(index.get(firstC18().url)).toBe(firstC18().id);
        expect(index.get(lastChisee().url)).toBe(lastChisee().id);
    });
});
