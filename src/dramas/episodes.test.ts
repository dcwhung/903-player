import { DRAMA_AUDIO_BASE } from '../config/constants';
import { buildEpisodes } from './episodes';
import type { DailyDefinition, DramaThemeDefinition, SeriesDefinition } from './schema';

const THEME: DramaThemeDefinition = {
    bg: '#000000',
    surface: '#000000',
    track: '#000000',
    accent: '#000000',
    onAccent: '#000000',
    title: '#000000',
    text: '#000000',
    muted: '#000000',
    shadowDark: '#000000',
    shadowLight: '#000000',
};

const arc = (
    name: string,
    count: number,
    extra: Partial<SeriesDefinition['arcs'][number]> = {},
): SeriesDefinition['arcs'][number] => ({
    name,
    firstNo: 1,
    count,
    titles: new Map(),
    files: new Map(),
    ...extra,
});

const SERIES: SeriesDefinition = {
    kind: 'series',
    name: '芝See菇Bi Family',
    enabled: true,
    tile: 'tile.webp',
    disc: 'disc.webp',
    audio: {
        host: 'r2',
        folder: '芝See菇Bi Family',
        file: '{no2} - {arc} - 第{noZh}集[ - {title}].m4a',
    },
    theme: THEME,
    arcs: [
        arc('Ｘ時mas時小提議', 2, { titles: new Map([[2, '哥哥 _ 你洽我']]) }),
        arc('初戀嗱喳麵', 2, { firstNo: 0, titles: new Map([[0, '前傳']]), addedAt: '2026-10-25' }),
        arc('亂碼', 2, { files: new Map([[2, 'weird upload.m4a']]) }),
        arc('有名冇檔', 1, {
            titles: new Map([[1, '秘撈']]),
            file: '{no2} - {arc} - 第{noZh}集.m4a',
        }),
    ],
};

const DAILY: DailyDefinition = {
    kind: 'daily',
    name: '18 樓 C 座',
    enabled: false,
    tile: 'tile.webp',
    disc: 'disc.webp',
    audio: { host: 'app', folder: 'c18', file: '{yyyymmdd}.m4a' },
    theme: THEME,
    episodes: [
        { date: '2026-10-23', rerun: false },
        { date: '2025-08-13', rerun: true, file: 'legacy.m4a' },
    ],
};

const R2 = `${DRAMA_AUDIO_BASE}/芝See菇Bi Family`;

describe('buildEpisodes (series)', () => {
    const episodes = buildEpisodes('chisee', SERIES);

    it('expands every arc into numbered episodes with the series literal kind', () => {
        expect(episodes).toHaveLength(7);
        expect(episodes.every((e) => e.kind === 'series' && e.dramaId === 'chisee')).toBe(true);
        expect(episodes.map((e) => (e.kind === 'series' ? `${e.arc}#${e.no}` : ''))).toEqual([
            'Ｘ時mas時小提議#1',
            'Ｘ時mas時小提議#2',
            '初戀嗱喳麵#0',
            '初戀嗱喳麵#1',
            '亂碍#1'.replace('碍', '碼'),
            '亂碼#2',
            '有名冇檔#1',
        ]);
    });

    it('builds the R2 url from the template, encoding every segment', () => {
        expect(decodeURIComponent(episodes[0]?.url ?? '')).toBe(
            `${R2}/Ｘ時mas時小提議/01 - Ｘ時mas時小提議 - 第一集.m4a`,
        );
        expect(episodes[0]?.url).toContain(encodeURIComponent('Ｘ時mas時小提議'));
    });

    it('puts the raw title in the file name and the display title on the episode', () => {
        const second = episodes[1];
        expect(decodeURIComponent(second?.url ?? '')).toBe(
            `${R2}/Ｘ時mas時小提議/02 - Ｘ時mas時小提議 - 第二集 - 哥哥 _ 你洽我.m4a`,
        );
        expect(second?.kind === 'series' && second.title).toBe('哥哥：你洽我');
        expect(episodes[0]?.kind === 'series' && 'title' in episodes[0]).toBe(false);
    });

    it('starts at 第零集 when firstNo is 0 and carries the arc addedAt', () => {
        const prelude = episodes[2];
        expect(prelude?.kind === 'series' && prelude.no).toBe(0);
        expect(decodeURIComponent(prelude?.url ?? '')).toContain(
            '00 - 初戀嗱喳麵 - 第零集 - 前傳.m4a',
        );
        expect(prelude?.kind === 'series' && prelude.addedAt).toBe('2026-10-25');
        expect(episodes[0]?.kind === 'series' && 'addedAt' in episodes[0]).toBe(false);
    });

    it('uses the drama-level addedAt when the arc has none', () => {
        const [first] = buildEpisodes('chisee', { ...SERIES, addedAt: '2026-01-01' });
        expect(first?.kind === 'series' && first.addedAt).toBe('2026-01-01');
    });

    it('prefers a per-episode file override to the template', () => {
        expect(decodeURIComponent(episodes[5]?.url ?? '')).toBe(`${R2}/亂碼/weird upload.m4a`);
        expect(decodeURIComponent(episodes[4]?.url ?? '')).toBe(
            `${R2}/亂碼/01 - 亂碼 - 第一集.m4a`,
        );
    });

    it('lets an arc template keep the title out of the file name but still show it', () => {
        const titled = episodes[6];
        expect(decodeURIComponent(titled?.url ?? '')).toBe(
            `${R2}/有名冇檔/01 - 有名冇檔 - 第一集.m4a`,
        );
        expect(titled?.kind === 'series' && titled.title).toBe('秘撈');
    });

    it('lets the template use the drama folder name (黃金少年Season 1 style)', () => {
        const def: SeriesDefinition = {
            ...SERIES,
            audio: {
                host: 'r2',
                folder: '黃金少年',
                file: '{no2} - {folder}{arc} - 第{noZh}集.m4a',
            },
            arcs: [arc('Season 1', 1)],
        };
        expect(decodeURIComponent(buildEpisodes('golden', def)[0]?.url ?? '')).toBe(
            `${DRAMA_AUDIO_BASE}/黃金少年/Season 1/01 - 黃金少年Season 1 - 第一集.m4a`,
        );
    });
});

describe('buildEpisodes (daily)', () => {
    const episodes = buildEpisodes('c18', DAILY);

    it('hosts app audio under BASE_URL/dramas/<folder>/ with the daily literal kind', () => {
        expect(episodes[0]).toEqual({
            kind: 'daily',
            dramaId: 'c18',
            url: `${import.meta.env.BASE_URL}dramas/c18/20261023.m4a`,
            date: '2026-10-23',
            rerun: false,
        });
    });

    it('keeps rerun and honours a per-episode file override', () => {
        expect(episodes[1]).toMatchObject({ rerun: true, date: '2025-08-13' });
        expect(episodes[1]?.url).toBe(`${import.meta.env.BASE_URL}dramas/c18/legacy.m4a`);
    });
});
