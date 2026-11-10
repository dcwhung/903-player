/*
 * generateDraft（純邏輯）：輸入 FolderListing，輸出 drama.json 草稿 + 問題清單。
 * 最重要嘅保證：草稿經 parseDramaDefinition + buildEpisodes 之後，每條錄音網址都對得返 listing 入面嘅真檔。
 */
import { DRAMA_AUDIO_BASE } from '../constants';
import { buildEpisodes } from '../dramas/episodes';
import { parseDramaDefinition } from '../dramas/schema';
import { generateDraft } from './draft';
import { episodeUrls } from './urls';
import { episodeFile, listingOf, range } from './testListing';
import type { DraftJson, DraftResult, Issue } from './types';

const TODAY = '2026-10-29';
const NFD_NAME = 'Café'.normalize('NFD');
const APP_AUDIO_BASE = 'https://app.invalid/dramas/';

type Json = Record<string, unknown>;

const imagesOf = (json: Json): string[] => {
    const arcs = (json.arcs as Json[] | undefined) ?? [];
    return [json.tile, json.disc, ...arcs.flatMap((a) => [a.disc, a.tile])].filter(
        (f): f is string => typeof f === 'string',
    );
};

const appEpisodes = (id: string, json: unknown) => {
    const files = new Set(imagesOf(json as Json));
    const def = parseDramaDefinition(json, { id, source: `${id}.drama.json`, files });
    return buildEpisodes(id, def, { appAudioBase: APP_AUDIO_BASE });
};

/** R2 網址 → 劇集 folder 底下嘅相對路徑（每段 decode） */
const pathOfUrl = (url: string, folder: string): string =>
    url
        .slice(`${DRAMA_AUDIO_BASE}/${encodeURIComponent(folder)}/`.length)
        .split('/')
        .map(decodeURIComponent)
        .join('/');

const messagesOf = (issues: readonly Issue[], level: string): string =>
    issues
        .filter((i) => i.level === level)
        .map((i) => `${i.where}：${i.message}`)
        .join('\n');

const jsonOf = (result: DraftResult): DraftJson => {
    if (result.json === null) throw new Error(messagesOf(result.issues, 'error'));
    return result.json;
};

describe('generateDraft — new series drama', () => {
    const DRAMA = '測試劇場';
    const build = (paths: readonly string[], id?: string) =>
        generateDraft(listingOf(DRAMA, paths), { id, today: TODAY });

    it('should build arcs in R2 (UTF-8 byte) order with counts, firstNo and titles', () => {
        const json = jsonOf(
            build([
                ...range(1, 3).map((n) => episodeFile('乙篇', n)),
                ...range(0, 2).map((n) => episodeFile('甲篇', n, n === 0 ? '前傳' : '')),
                ...range(1, 2).map((n) => episodeFile('丙篇', n, `集名${n}`)),
            ]),
        );
        expect(json).toMatchObject({
            name: DRAMA,
            kind: 'series',
            enabled: false,
            addedAt: TODAY,
            audio: {
                host: 'r2',
                folder: DRAMA,
                file: '{no2} - {arc} - 第{noZh}集[ - {title}].m4a',
            },
        });
        expect(json.arcs).toEqual([
            { id: 'arc-01', name: '丙篇', episodes: ['集名1', '集名2'] },
            { id: 'arc-02', name: '乙篇', episodes: 3 },
            { id: 'arc-03', name: '甲篇', firstNo: 0, episodes: 3, titles: { 0: '前傳' } },
        ]);
    });

    it('should give every new arc a placeholder id with a TODO warning to rename it', () => {
        const result = build([episodeFile('甲', 1)]);
        expect((jsonOf(result).arcs as Json[])[0]?.id).toBe('arc-01');
        expect(messagesOf(result.issues, 'warn')).toContain('甲：TODO：id「arc-01」係 placeholder');
    });

    it('should produce JSON the app accepts, with every URL pointing at a listed file', () => {
        const files = [
            ...range(1, 3).map((n) => episodeFile('森之愛情II - 電燈膽', n)),
            ...range(0, 1).map((n) => episodeFile('初戀', n, n ? '' : '前傳')),
            ...range(1, 2).map((n) => episodeFile('Ｘ時mas', n, 'A _ B')),
        ];
        const json = jsonOf(build([...files, 'cover photo.png', '初戀/cover-photo.jpg']));
        const urls = appEpisodes('test', json).map((e) => e.url);
        expect(urls.map((u) => pathOfUrl(u, DRAMA)).sort()).toEqual([...files].sort());
        expect(episodeUrls(json)).toEqual(urls);
    });

    it('should block on gaps, duplicates, unreadable names and mismatched numbers', () => {
        const { json, issues } = build([
            ...[1, 2, 4].map((n) => episodeFile('缺集', n)),
            episodeFile('重複', 1),
            '重複/01 - 重複 - 第一集 - 另一個.m4a',
            '亂名/第一集.m4a',
            episodeFile('亂名', 1),
            '錯號/02 - 錯號 - 第三集.m4a',
        ]);
        expect(json).toBeNull();
        const errors = messagesOf(issues, 'error');
        expect(errors).toContain('缺集：缺第 3 集');
        expect(errors).toContain('重複：第 1 集有 2 個檔');
        expect(errors).toContain('亂名：檔名唔符合');
        expect(errors).toContain('錯號：');
    });

    it('should block an arc folder without audio', () => {
        const { json, issues } = build(['甲/cover photo.jpg']);
        expect(json).toBeNull();
        expect(messagesOf(issues, 'error')).toContain('甲：冇錄音檔');
    });

    it('should warn (not block) when an arc does not start at episode 0 or 1', () => {
        const result = build(range(2, 3).map((n) => episodeFile('甲', n)));
        expect((jsonOf(result).arcs as Json[])[0]).toEqual({
            id: 'arc-01',
            name: '甲',
            firstNo: 2,
            episodes: 2,
        });
        expect(messagesOf(result.issues, 'warn')).toContain('甲：由第 2 集開始');
    });

    it('should normalise NFD names to NFC and warn about suspicious names', () => {
        const result = build([episodeFile(NFD_NAME, 1), episodeFile('森之愛情Ⅱ - 電燈膽', 1)]);
        const json = jsonOf(result);
        expect((json.arcs as Json[]).map((a) => a.name)).toContain('Café'.normalize('NFC'));
        const warnings = messagesOf(result.issues, 'warn');
        expect(warnings).toContain('NFD');
        expect(warnings).toContain('U+2161');
        appEpisodes('test', json);
    });

    it('should write files overrides when the filename arc label differs from the folder', () => {
        const result = build([1, 2].map((n) => episodeFile('森之愛情II', n, '', '森之愛情Ⅱ')));
        const json = jsonOf(result);
        expect((json.arcs as Json[])[0]).toEqual({
            id: 'arc-01',
            name: '森之愛情II',
            episodes: 2,
            files: { 1: '01 - 森之愛情Ⅱ - 第一集.m4a', 2: '02 - 森之愛情Ⅱ - 第二集.m4a' },
        });
        expect(messagesOf(result.issues, 'warn')).toContain('Unicode');
        expect(appEpisodes('test', json).map((e) => pathOfUrl(e.url, DRAMA))).toEqual([
            '森之愛情II/01 - 森之愛情Ⅱ - 第一集.m4a',
            '森之愛情II/02 - 森之愛情Ⅱ - 第二集.m4a',
        ]);
    });

    it('should list covers and warn about audio at the drama level', () => {
        const { scan, issues } = build([
            episodeFile('甲', 1),
            'cover photo.png',
            '甲/cover photo.jpg',
            '甲/.DS_Store',
            '甲/notes.txt',
            'stray.m4a',
        ]);
        expect(scan.covers).toEqual(['cover photo.png']);
        expect(scan.arcs[0]?.covers).toEqual(['cover photo.jpg']);
        expect(scan.arcs[0]?.ignored).toEqual(['.DS_Store', 'notes.txt']);
        expect(messagesOf(issues, 'warn')).toContain('stray.m4a');
    });

    it('should pick the {folder}{arc} template when filenames carry the drama name', () => {
        const json = jsonOf(
            build(range(1, 2).map((n) => episodeFile('Season 1', n, '', `${DRAMA}Season 1`))),
        );
        expect((json.audio as Json).file).toBe(
            '{no2} - {folder}{arc} - 第{noZh}集[ - {title}].m4a',
        );
        expect((json.arcs as Json[])[0]).toEqual({ id: 'arc-01', name: 'Season 1', episodes: 2 });
    });

    it('should block when the folder has no arcs and no audio', () => {
        const result = build(['cover photo.png']);
        expect(result.kind).toBe('none');
        expect(result.json).toBeNull();
    });

    it('should warn about an id the app would reject', () => {
        const result = build([episodeFile('甲', 1)], 'Bad_ID');
        expect(messagesOf(result.issues, 'warn')).toContain('--id「Bad_ID」唔合 app 規則');
    });
});

describe('generateDraft — merging with an existing definition', () => {
    const DRAMA = '合併劇';
    const draft = (paths: readonly string[], existing?: unknown) =>
        generateDraft(listingOf(DRAMA, paths), { existing, today: TODAY });

    /** 先由 listing 生成一次，再按需要改舊 arc，當做 existing */
    const mergeWith = (paths: readonly string[], editArc: (arc: Json) => Json) => {
        const base = jsonOf(draft(paths));
        const existing = { ...base, arcs: (base.arcs as Json[]).map(editArc) };
        const result = draft(paths, existing);
        return { result, arc: (jsonOf(result).arcs as Json[])[0] };
    };

    it('should keep hand-written fields, keep a missing arc and date a new arc today', () => {
        const paths = range(1, 2).map((n) => episodeFile('甲', n));
        const base = jsonOf(draft(paths));
        const oldArc = { id: 'kept', name: '甲', disc: 'arcs/kept/disc.webp', episodes: 1 };
        const gone = { id: 'gone', name: '已走', episodes: 3 };
        const existing = { ...base, name: '人手名', order: 3, arcs: [oldArc, gone] };
        const result = draft([...paths, episodeFile('新', 1)], existing);
        expect(jsonOf(result)).toMatchObject({ name: '人手名', order: 3 });
        expect(jsonOf(result).arcs).toEqual([
            { ...oldArc, episodes: 2 },
            gone,
            { id: 'arc-01', name: '新', addedAt: TODAY, episodes: 1 },
        ]);
        expect(messagesOf(result.issues, 'warn')).toContain('已走：本機 folder 冇呢個短篇');
        expect(messagesOf(result.issues, 'info')).toContain('甲：集數由 1 變 2');
        expect(messagesOf(result.issues, 'info')).toContain('新：新短篇');
    });

    it('should keep a hand-written title the filenames cannot express, with files for the URL', () => {
        const paths = range(1, 2).map((n) => episodeFile('甲', n));
        const { result, arc } = mergeWith(paths, (a) => ({ ...a, titles: { 1: '人手補嘅集名' } }));
        expect(arc).toEqual({
            id: 'arc-01',
            name: '甲',
            episodes: 2,
            titles: { 1: '人手補嘅集名' },
            files: { 1: '01 - 甲 - 第一集.m4a' },
        });
        expect(messagesOf(result.issues, 'warn')).toContain('甲：第 1 集嘅集名「人手補嘅集名」');
        const urls = appEpisodes('test', jsonOf(result)).map((e) => pathOfUrl(e.url, DRAMA));
        expect(urls).toEqual(paths);
    });

    it('should report titles that changed in the folder', () => {
        const paths = [episodeFile('甲', 1, '新名'), episodeFile('甲', 2, 'B')];
        const { result, arc } = mergeWith(paths, (a) => ({ ...a, episodes: ['舊名', 'B'] }));
        expect(arc).toEqual({ id: 'arc-01', name: '甲', episodes: ['新名', 'B'] });
        expect(messagesOf(result.issues, 'info')).toContain('甲：集名有變（第 1 集）');
    });

    it('should report firstNo and files changes', () => {
        const paths = range(0, 1).map((n) => episodeFile('甲', n));
        const { result, arc } = mergeWith(paths, ({ firstNo: _f, ...a }) => ({
            ...a,
            files: { 2: 'x.m4a' },
        }));
        expect(arc).toEqual({ id: 'arc-01', name: '甲', firstNo: 0, episodes: 2 });
        const info = messagesOf(result.issues, 'info');
        expect(info).toContain('甲：由第 1 集開始變第 0 集開始');
        expect(info).toContain('甲：files 有變（第 2 集）');
    });

    it('should warn when the existing audio.folder differs from the listing name', () => {
        const paths = [episodeFile('甲', 1)];
        const base = jsonOf(draft(paths));
        const existing = { ...base, audio: { ...(base.audio as Json), folder: '另一個' } };
        expect(messagesOf(draft(paths, existing).issues, 'warn')).toContain(
            'audio.folder「另一個」同本機 folder 名唔一樣',
        );
    });

    /** 壞 / 唔夾嘅 existing：唔可以 throw，要 [錯誤] 兼唔出 json */
    const blockedBy = (bad: unknown): string => {
        const result = draft([episodeFile('甲', 1)], bad);
        expect(result.json).toBeNull();
        return messagesOf(result.issues, 'error');
    };

    it('should report a daily definition given for a series folder instead of crashing', () => {
        expect(blockedBy({ kind: 'daily', episodes: [] })).toContain(
            '--existing 係 daily，但 folder 睇落係 series',
        );
    });

    it('should report a typo in the existing audio.file template', () => {
        const bad = { kind: 'series', audio: { host: 'r2', folder: DRAMA, file: '{arcc}.m4a' } };
        expect(blockedBy(bad)).toContain('{arcc}');
    });

    it('should report arcs that are not a list, or arcs without a name', () => {
        const audio = { host: 'r2', folder: DRAMA, file: '{no2}.m4a' };
        expect(blockedBy({ kind: 'series', audio, arcs: { name: '甲' } })).toContain('arcs');
        expect(blockedBy({ kind: 'series', audio, arcs: [null] })).toContain('arcs');
    });

    it('should report a null or non-object existing value instead of treating it as new', () => {
        expect(blockedBy(null)).toContain('--existing 唔係 drama.json');
        expect(blockedBy([])).toContain('--existing 唔係 drama.json');
    });
});

describe('generateDraft — daily drama', () => {
    it('should build a newest-first daily drama the app accepts', () => {
        const listing = listingOf('每日劇', ['20261022.m4a', '20261023.m4a', 'cover photo.jpg']);
        const result = generateDraft(listing, { today: TODAY });
        expect(messagesOf(result.issues, 'error')).toBe('');
        const json = jsonOf(result);
        expect(json).toMatchObject({
            kind: 'daily',
            audio: { host: 'r2', folder: '每日劇', file: '{yyyymmdd}.m4a' },
            episodes: [{ date: '2026-10-23' }, { date: '2026-10-22' }],
        });
        expect(appEpisodes('daily', json).map((e) => pathOfUrl(e.url, '每日劇'))).toEqual([
            '20261023.m4a',
            '20261022.m4a',
        ]);
    });

    it('should keep existing rerun / file fields and dates missing from the folder', () => {
        const listing = listingOf('每日劇', ['20261022.m4a', '20261024.m4a']);
        const existing = {
            kind: 'daily',
            audio: { host: 'r2', folder: '每日劇', file: '{yyyymmdd}.m4a' },
            episodes: [{ date: '2026-10-22', rerun: true }, { date: '2026-10-20' }],
        };
        const result = generateDraft(listing, { existing, today: TODAY });
        expect(jsonOf(result).episodes).toEqual([
            { date: '2026-10-24' },
            { date: '2026-10-22', rerun: true },
            { date: '2026-10-20' },
        ]);
        expect(messagesOf(result.issues, 'warn')).toContain('2026-10-20：本機 folder 冇呢日');
    });

    it('should block on audio files that are not YYYYMMDD.m4a', () => {
        const listing = listingOf('每日劇', ['20261023.m4a', '20261332.m4a']);
        const { json, issues } = generateDraft(listing, { today: TODAY });
        expect(json).toBeNull();
        expect(messagesOf(issues, 'error')).toContain('20261332.m4a');
    });
});
