// @vitest-environment node
/*
 * scripts/dramaFromFolder.mjs：由本機劇集 folder 生成 drama.json 草稿。
 * 最重要嘅保證：輸出經 app 真正嘅 validator（parseDramaDefinition）+ buildEpisodes 之後，
 * 每條錄音網址都對得返 folder 入面真實存在嘅檔（URL 係已儲進度嘅 key，一個 byte 都唔可以差）。
 */
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { DRAMA_AUDIO_BASE as APP_AUDIO_BASE } from '../src/config/constants';
import { buildEpisodes } from '../src/dramas/episodes';
import { parseDramaDefinition } from '../src/dramas/schema';
import {
    DRAMA_AUDIO_BASE,
    EXIT,
    generateDraft,
    episodeUrls,
    findSuspicious,
    parseEpisodeFileName,
    parseEpisodeNumeral,
    run,
    todayInHongKong,
    toChineseNumeral,
    verifyUrls,
    type DraftResult,
} from './dramaFromFolder.mjs';

const SCRIPT = new URL('./dramaFromFolder.mjs', import.meta.url);
const DRAMAS_DIR = new URL('../src/dramas/', import.meta.url);
/** 香港時間 2026-10-29 04:00（UTC 仲係 28 號），驗 addedAt 用香港日期 */
const NOW = new Date('2026-10-28T20:00:00Z');
const TODAY = '2026-10-29';
const NFD_NAME = 'Café'.normalize('NFD');
const SERIES_IDS = ['lancy', 'chisee', 'golden', 'jim', 'sammy-kitty'] as const;
const VERIFY_TIMEOUT_MS = 300;
const HANG_MS = 2000;
const CONCURRENCY = 2;
const HTTP_OK = 200;
const HTTP_NOT_FOUND = 404;

type Json = Record<string, unknown>;
type Issue = { level: string; where: string; message: string };

let root: string;
beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'drama-from-folder-'));
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

/** 喺 root 底下建一堆空檔（路徑用 / 分隔） */
const touch = (paths: readonly string[]): void =>
    paths.forEach((path) => {
        const full = join(root, ...path.split('/'));
        mkdirSync(dirname(full), { recursive: true });
        writeFileSync(full, '');
    });

/** 「NN - 短篇 - 第N集[ - 集名].m4a」 */
const episodeFile = (arc: string, no: number, title?: string, label = arc): string =>
    `${arc}/${String(no).padStart(2, '0')} - ${label} - 第${toChineseNumeral(no)}集${title ? ` - ${title}` : ''}.m4a`;

const range = (first: number, last: number): number[] =>
    Array.from({ length: last - first + 1 }, (_, i) => first + i);

const imagesOf = (json: Json): string[] => {
    const arcs = (json.arcs as Json[] | undefined) ?? [];
    return [json.tile, json.disc, ...arcs.flatMap((a) => [a.disc, a.tile])].filter(
        (f): f is string => typeof f === 'string',
    );
};

/** 用 app 真正嘅 validator + episode builder 展開（唔合格會 throw） */
const appEpisodes = (id: string, json: unknown) => {
    const files = new Set(imagesOf(json as Json));
    const def = parseDramaDefinition(json, { id, source: `${id}.drama.json`, files });
    return buildEpisodes(id, def);
};

/** R2 網址 → root 底下嘅相對路徑 */
const pathOfUrl = (url: string): string =>
    url
        .slice(APP_AUDIO_BASE.length + 1)
        .split('/')
        .map(decodeURIComponent)
        .join('/');

const listFiles = (dir: string, prefix = ''): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
        entry.isDirectory()
            ? listFiles(join(dir, entry.name), `${prefix}${entry.name}/`)
            : [`${prefix}${entry.name}`],
    );

/** 生成成功嘅 drama.json；有 error 就直接 fail 兼列出原因 */
const jsonOf = (result: DraftResult): Json => {
    if (result.json === null) throw new Error(messagesOf(result.issues, 'error'));
    return result.json;
};

const errorsOf = (issues: readonly Issue[]): Issue[] => issues.filter((i) => i.level === 'error');
const messagesOf = (issues: readonly Issue[], level: string): string =>
    issues
        .filter((i) => i.level === level)
        .map((i) => `${i.where}：${i.message}`)
        .join('\n');

describe('toChineseNumeral / parseEpisodeNumeral', () => {
    it('should round-trip every episode number from 0 to 99', () => {
        range(0, 99).forEach((n) => expect(parseEpisodeNumeral(toChineseNumeral(n))).toBe(n));
        expect(toChineseNumeral(0)).toBe('零');
        expect(toChineseNumeral(36)).toBe('三十六');
    });

    it('should accept arabic digits and reject nonsense', () => {
        expect(parseEpisodeNumeral('12')).toBe(12);
        expect(parseEpisodeNumeral('十十')).toBeUndefined();
    });
});

describe('parseEpisodeFileName', () => {
    it('should read number, arc label and title', () => {
        expect(parseEpisodeFileName('01 - 森之聖誕2010 - 第一集 - 不會飛走的氣球.m4a')).toEqual({
            file: '01 - 森之聖誕2010 - 第一集 - 不會飛走的氣球.m4a',
            no: 1,
            zhNo: 1,
            label: '森之聖誕2010',
            title: '不會飛走的氣球',
            ext: '.m4a',
        });
    });

    it('should keep " - " inside the arc name and handle 第零集', () => {
        expect(parseEpisodeFileName('03 - 森之愛情I - 森之聖誕 - 第三集.m4a')).toMatchObject({
            no: 3,
            label: '森之愛情I - 森之聖誕',
            title: '',
        });
        expect(parseEpisodeFileName('00 - 初戀嗱喳麵 - 第零集 - 前傳.m4a')).toMatchObject({
            no: 0,
            zhNo: 0,
        });
    });

    it('should return null for names outside the pattern', () => {
        expect(parseEpisodeFileName('第一集.m4a')).toBeNull();
        expect(parseEpisodeFileName('01 森林 第一集.m4a')).toBeNull();
    });
});

describe('findSuspicious', () => {
    it('should flag roman numerals, full-width, NFD, spaces and invisible characters', () => {
        expect(findSuspicious('森之愛情Ⅱ - 電燈膽').join()).toContain('U+2161');
        expect(findSuspicious('Ｘ時mas').join()).toContain('U+FF38');
        expect(findSuspicious(NFD_NAME).join()).toContain('NFD');
        expect(findSuspicious(' 短篇 ').join()).toContain('頭尾');
        expect(findSuspicious('短篇\u200b').join()).toContain('U+200B');
        expect(findSuspicious('短篇\u3000名').join()).toContain('U+3000');
        expect(findSuspicious('蘭茜夫人劇場')).toEqual([]);
    });
});

describe('todayInHongKong', () => {
    it('should use the Hong Kong calendar date', () => {
        expect(todayInHongKong(NOW)).toBe(TODAY);
    });
});

describe('generateDraft — new series drama', () => {
    const DRAMA = '測試劇場';
    const build = () => generateDraft(join(root, DRAMA), { now: NOW });

    it('should build arcs in R2 (UTF-8 byte) order with counts, firstNo and titles', () => {
        touch([
            ...range(1, 3).map((n) => `${DRAMA}/${episodeFile('乙篇', n)}`),
            ...range(0, 2).map((n) => `${DRAMA}/${episodeFile('甲篇', n, n === 0 ? '前傳' : '')}`),
            ...range(1, 2).map((n) => `${DRAMA}/${episodeFile('丙篇', n, `集名${n}`)}`),
        ]);
        const json = jsonOf(build());
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
            { name: '丙篇', episodes: ['集名1', '集名2'] },
            { name: '乙篇', episodes: 3 },
            { name: '甲篇', firstNo: 0, episodes: 3, titles: { 0: '前傳' } },
        ]);
    });

    it('should produce JSON the app accepts, with every URL pointing at a real file', () => {
        const files = [
            ...range(1, 3).map((n) => `${DRAMA}/${episodeFile('森之愛情II - 電燈膽', n)}`),
            ...range(0, 1).map((n) => `${DRAMA}/${episodeFile('初戀', n, n ? '' : '前傳')}`),
            ...range(1, 2).map((n) => `${DRAMA}/${episodeFile('Ｘ時mas', n, 'A _ B')}`),
        ];
        touch([...files, `${DRAMA}/cover photo.png`, `${DRAMA}/初戀/cover-photo.jpg`]);
        const json = jsonOf(build());
        const urls = appEpisodes('test', json).map((e) => e.url);
        expect(urls.map(pathOfUrl).sort()).toEqual([...files].sort());
        expect(episodeUrls(json)).toEqual(urls);
    });

    it('should block on gaps, duplicates, unreadable names and mismatched numbers', () => {
        touch([
            ...[1, 2, 4].map((n) => `${DRAMA}/${episodeFile('缺集', n)}`),
            `${DRAMA}/${episodeFile('重複', 1)}`,
            `${DRAMA}/重複/01 - 重複 - 第一集 - 另一個.m4a`,
            `${DRAMA}/亂名/第一集.m4a`,
            `${DRAMA}/亂名/${episodeFile('亂名', 1).split('/')[1]}`,
            `${DRAMA}/錯號/02 - 錯號 - 第三集.m4a`,
        ]);
        const { json, issues } = build();
        expect(json).toBeNull();
        const errors = messagesOf(issues, 'error');
        expect(errors).toContain('缺集：缺第 3 集');
        expect(errors).toContain('重複：第 1 集有 2 個檔');
        expect(errors).toContain('亂名：檔名唔符合');
        expect(errors).toContain('錯號：');
    });

    it('should normalise NFD names to NFC and warn about suspicious names', () => {
        touch([
            `${DRAMA}/${episodeFile(NFD_NAME, 1)}`,
            `${DRAMA}/${episodeFile('森之愛情Ⅱ - 電燈膽', 1)}`,
        ]);
        const result = build();
        const { issues } = result;
        const json = jsonOf(result);
        const arcs = json.arcs as Json[];
        expect(arcs.map((a) => a.name)).toContain('Café'.normalize('NFC'));
        const warnings = messagesOf(issues, 'warn');
        expect(warnings).toContain('NFD');
        expect(warnings).toContain('U+2161');
        appEpisodes('test', json);
    });

    it('should write files overrides when the filename arc label differs from the folder', () => {
        touch([1, 2].map((n) => `${DRAMA}/${episodeFile('森之愛情II', n, '', '森之愛情Ⅱ')}`));
        const result = build();
        const { issues } = result;
        const json = jsonOf(result);
        expect((json.arcs as Json[])[0]).toEqual({
            name: '森之愛情II',
            episodes: 2,
            files: {
                1: '01 - 森之愛情Ⅱ - 第一集.m4a',
                2: '02 - 森之愛情Ⅱ - 第二集.m4a',
            },
        });
        expect(messagesOf(issues, 'warn')).toContain('Unicode');
        expect(appEpisodes('test', json).map((e) => pathOfUrl(e.url))).toEqual([
            `${DRAMA}/森之愛情II/01 - 森之愛情Ⅱ - 第一集.m4a`,
            `${DRAMA}/森之愛情II/02 - 森之愛情Ⅱ - 第二集.m4a`,
        ]);
    });

    it('should list covers and ignored files', () => {
        touch([
            `${DRAMA}/${episodeFile('甲', 1)}`,
            `${DRAMA}/cover photo.png`,
            `${DRAMA}/甲/cover photo.jpg`,
            `${DRAMA}/甲/.DS_Store`,
            `${DRAMA}/甲/notes.txt`,
            `${DRAMA}/stray.m4a`,
        ]);
        const { scan, issues } = build();
        expect(scan.covers).toEqual(['cover photo.png']);
        expect(scan.arcs[0]?.covers).toEqual(['cover photo.jpg']);
        expect(scan.arcs[0]?.ignored).toEqual(['.DS_Store', 'notes.txt']);
        expect(messagesOf(issues, 'warn')).toContain('stray.m4a');
    });

    it('should pick the {folder}{arc} template when filenames carry the drama name', () => {
        touch(
            range(1, 2).map(
                (n) => `${DRAMA}/${episodeFile('Season 1', n, '', `${DRAMA}Season 1`)}`,
            ),
        );
        const json = jsonOf(build());
        expect((json.audio as Json).file).toBe(
            '{no2} - {folder}{arc} - 第{noZh}集[ - {title}].m4a',
        );
        expect((json.arcs as Json[])[0]).toEqual({ name: 'Season 1', episodes: 2 });
    });

    it('should block when the folder has no arcs and no audio', () => {
        touch([`${DRAMA}/cover photo.png`]);
        expect(build().json).toBeNull();
    });
});

describe('generateDraft — committed dramas round-trip', () => {
    const committed = (id: string): Json =>
        JSON.parse(readFileSync(new URL(`${id}/drama.json`, DRAMAS_DIR), 'utf8')) as Json;

    /** 照 app 砌出嚟嘅網址喺 root 建返成棵 R2 folder 樹（連 cover） */
    const mirrorR2 = (id: string): string => {
        const json = committed(id);
        const folder = (json.audio as Json).folder as string;
        const arcs = ((json.arcs as Json[]) ?? []).map(
            (a) => `${folder}/${a.name as string}/cover photo.jpg`,
        );
        touch([
            ...appEpisodes(id, json).map((e) => pathOfUrl(e.url)),
            `${folder}/cover photo.png`,
            ...arcs,
        ]);
        return join(root, folder);
    };

    it.each(SERIES_IDS)('should regenerate %s unchanged with --existing', (id) => {
        const { json, issues } = generateDraft(mirrorR2(id), { existing: committed(id), now: NOW });
        expect(errorsOf(issues)).toEqual([]);
        expect(json).toEqual(committed(id));
    });

    it.each(SERIES_IDS)('should rebuild the same URLs for %s from scratch', (id) => {
        const json = jsonOf(generateDraft(mirrorR2(id), { now: NOW }));
        const urls = appEpisodes(id, json).map((e) => e.url);
        expect([...urls].sort()).toEqual(
            appEpisodes(id, committed(id))
                .map((e) => e.url)
                .sort(),
        );
    });

    it('should regenerate the lancy arcs exactly (diff against committed drama.json)', () => {
        const json = jsonOf(generateDraft(mirrorR2('lancy'), { now: NOW }));
        const strip = (arcs: Json[]) =>
            arcs
                .map(({ name, episodes }) => ({ name, episodes }))
                .sort((a, b) => String(a.name).localeCompare(String(b.name)));
        expect(strip(json.arcs as Json[])).toEqual(strip(committed('lancy').arcs as Json[]));
    });
});

describe('generateDraft — merging with --existing', () => {
    const DRAMA = '蘭茜夫人劇場';
    const existing = (): Json =>
        JSON.parse(readFileSync(new URL('lancy/drama.json', DRAMAS_DIR), 'utf8')) as Json;

    it('should keep hand-written fields, flag a missing arc and date a new arc today', () => {
        touch([
            ...range(1, 31).map((n) => `${DRAMA}/${episodeFile('戀愛二分一', n)}`),
            ...range(1, 33).map((n) => `${DRAMA}/${episodeFile('初戀無限次', n)}`),
            ...range(1, 2).map((n) => `${DRAMA}/${episodeFile('新短篇', n)}`),
        ]);
        const { json, issues } = generateDraft(join(root, DRAMA), {
            existing: existing(),
            now: NOW,
        });
        const { arcs, ...rest } = json as Json;
        const { arcs: oldArcs, ...oldRest } = existing();
        expect(rest).toEqual(oldRest);
        expect(arcs).toEqual([
            { ...(oldArcs as Json[])[0], episodes: 31 },
            (oldArcs as Json[])[1],
            (oldArcs as Json[])[2],
            { name: '新短篇', addedAt: TODAY, episodes: 2 },
        ]);
        expect(messagesOf(issues, 'warn')).toContain('我心不死：本機 folder 冇呢個短篇');
        expect(messagesOf(issues, 'info')).toContain('戀愛二分一：集數由 30 變 31');
        expect(messagesOf(issues, 'info')).toContain('新短篇：新短篇');
    });

    it('should block when the existing kind does not match the folder', () => {
        touch([`${DRAMA}/20261023.m4a`]);
        expect(
            generateDraft(join(root, DRAMA), { existing: existing(), now: NOW }).json,
        ).toBeNull();
    });

    /** 壞 / 唔夾嘅 --existing：唔可以 throw，要 [錯誤] 兼唔出 json */
    const blockedBy = (bad: unknown): string => {
        touch([`${DRAMA}/${episodeFile('甲', 1)}`]);
        const result = generateDraft(join(root, DRAMA), {
            existing: bad as Json,
            now: NOW,
        });
        expect(result.json).toBeNull();
        return messagesOf(result.issues, 'error');
    };

    it('should report a daily drama.json given for a series folder instead of crashing', () => {
        const c18 = JSON.parse(readFileSync(new URL('c18/drama.json', DRAMAS_DIR), 'utf8'));
        expect(blockedBy(c18)).toContain('--existing 係 daily，但 folder 睇落係 series');
    });

    it('should report a typo in the existing audio.file template', () => {
        const bad = { ...existing(), audio: { host: 'r2', folder: DRAMA, file: '{arcc}.m4a' } };
        expect(blockedBy(bad)).toContain('{arcc}');
    });

    it('should report arcs that are not a list, or arcs without a name', () => {
        expect(blockedBy({ ...existing(), arcs: { name: '甲' } })).toContain('arcs');
        expect(blockedBy({ ...existing(), arcs: [null] })).toContain('arcs');
    });

    it('should report a null or non-object existing file instead of treating it as new', () => {
        expect(blockedBy(null)).toContain('--existing 唔係 drama.json');
        expect(blockedBy([])).toContain('--existing 唔係 drama.json');
    });
});

describe('generateDraft — daily drama', () => {
    const c18 = (): Json =>
        JSON.parse(readFileSync(new URL('c18/drama.json', DRAMAS_DIR), 'utf8')) as Json;

    it('should build a newest-first daily drama the app accepts', () => {
        touch(['每日劇/20261022.m4a', '每日劇/20261023.m4a', '每日劇/cover photo.jpg']);
        const { json, issues } = generateDraft(join(root, '每日劇'), { now: NOW });
        expect(errorsOf(issues)).toEqual([]);
        expect(json).toMatchObject({
            kind: 'daily',
            audio: { host: 'r2', folder: '每日劇', file: '{yyyymmdd}.m4a' },
            episodes: [{ date: '2026-10-23' }, { date: '2026-10-22' }],
        });
        expect(appEpisodes('daily', json).map((e) => pathOfUrl(e.url))).toEqual([
            '每日劇/20261023.m4a',
            '每日劇/20261022.m4a',
        ]);
    });

    it('should regenerate c18 unchanged with --existing (rerun flags kept)', () => {
        const dates = (c18().episodes as Json[]).map((e) => String(e.date).replaceAll('-', ''));
        touch(dates.map((d) => `c18/${d}.m4a`));
        const { json } = generateDraft(join(root, 'c18'), { existing: c18(), now: NOW });
        expect(json).toEqual(c18());
    });

    it('should block on audio files that are not YYYYMMDD.m4a', () => {
        touch(['每日劇/20261023.m4a', '每日劇/20261332.m4a']);
        const { json, issues } = generateDraft(join(root, '每日劇'), { now: NOW });
        expect(json).toBeNull();
        expect(messagesOf(issues, 'error')).toContain('20261332.m4a');
    });
});

describe('verifyUrls', () => {
    let server: Server;
    let base: string;
    let inFlight = 0;
    let maxInFlight = 0;

    beforeEach(async () => {
        // tests/setup.ts 預設封咗 fetch；呢度只連本機 server，換返真 fetch
        vi.unstubAllGlobals();
        inFlight = 0;
        maxInFlight = 0;
        server = createServer((req, res) => {
            inFlight += 1;
            maxInFlight = Math.max(maxInFlight, inFlight);
            const finish = (status: number) => {
                inFlight -= 1;
                res.writeHead(status).end();
            };
            if (req.url?.startsWith('/hang'))
                return void setTimeout(() => finish(HTTP_OK), HANG_MS);
            setTimeout(() => finish(req.url?.startsWith('/ok') ? HTTP_OK : HTTP_NOT_FOUND), 20);
        });
        await new Promise<void>((done) => server.listen(0, '127.0.0.1', done));
        base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    });
    afterEach(() => {
        server.closeAllConnections();
        server.close();
    });

    it('should HEAD every URL with limited concurrency and report failures and timeouts', async () => {
        const urls = [
            ...range(1, 5).map((n) => `${base}/ok/${n}`),
            `${base}/missing`,
            `${base}/hang`,
        ];
        const failures = await verifyUrls(urls, {
            concurrency: CONCURRENCY,
            timeoutMs: VERIFY_TIMEOUT_MS,
        });
        expect(failures.map((f: { url: string }) => f.url)).toEqual([
            `${base}/missing`,
            `${base}/hang`,
        ]);
        expect(failures[0]?.reason).toContain('404');
        expect(failures[1]?.reason).toContain('逾時');
        expect(maxInFlight).toBeLessThanOrEqual(CONCURRENCY);
    });

    it('should verify a generated drama end to end through the CLI', async () => {
        touch([`劇/${episodeFile('甲', 1)}`, `劇/甲/cover photo.jpg`]);
        const out: string[] = [];
        const code = await run(
            [join(root, '劇'), '--out', join(root, 'out.json'), '--verify', '--base', base],
            { out: (s: string) => out.push(s), now: () => NOW },
        );
        expect(code).toBe(EXIT.verifyFailed);
        expect(out.join('\n')).toContain('劇/甲/01 - 甲 - 第一集.m4a');
        expect(out.join('\n')).toContain('劇/甲/cover photo.jpg');
    });
});

describe('run (CLI)', () => {
    const runCli = async (argv: string[]) => {
        const out: string[] = [];
        const code = await run(argv, { out: (s: string) => out.push(s), now: () => NOW });
        return { code, text: out.join('\n') };
    };

    it('should write the draft and print a report', async () => {
        touch([...range(1, 2).map((n) => `劇/${episodeFile('甲', n)}`), '劇/甲/cover photo.jpg']);
        const outFile = join(root, 'x.drama.json');
        const { code, text } = await runCli([join(root, '劇'), '--id', 'xyz', '--out', outFile]);
        expect(code).toBe(EXIT.ok);
        expect(text).toContain('甲：2 集（第 1–2 集）');
        expect(text).toContain('cover photo.jpg');
        expect(JSON.parse(readFileSync(outFile, 'utf8'))).toMatchObject({ kind: 'series' });
    });

    it('should default the output name to <id>.drama.json in the working directory', async () => {
        touch([`劇/${episodeFile('甲', 1)}`]);
        const cwd = process.cwd();
        process.chdir(root);
        try {
            expect((await runCli([join(root, '劇'), '--id', 'xyz'])).code).toBe(EXIT.ok);
        } finally {
            process.chdir(cwd);
        }
        expect(listFiles(root)).toContain('xyz.drama.json');
    });

    it('should refuse to overwrite an existing output file unless --force', async () => {
        touch([`劇/${episodeFile('甲', 1)}`]);
        const outFile = join(root, 'x.drama.json');
        writeFileSync(outFile, 'hand-edited');
        const refused = await runCli([join(root, '劇'), '--out', outFile]);
        expect(refused.code).toBe(EXIT.usage);
        expect(refused.text).toContain('--force');
        expect(readFileSync(outFile, 'utf8')).toBe('hand-edited');
        const forced = await runCli([join(root, '劇'), '--out', outFile, '--force']);
        expect(forced.code).toBe(EXIT.ok);
        expect(JSON.parse(readFileSync(outFile, 'utf8'))).toMatchObject({ kind: 'series' });
    });

    it('should refuse --out pointing at the --existing file unless --force', async () => {
        touch([`劇/${episodeFile('甲', 1)}`]);
        const first = join(root, 'first.json');
        expect((await runCli([join(root, '劇'), '--out', first])).code).toBe(EXIT.ok);
        const before = readFileSync(first, 'utf8');
        const { code } = await runCli([join(root, '劇'), '--existing', first, '--out', first]);
        expect(code).toBe(EXIT.usage);
        expect(readFileSync(first, 'utf8')).toBe(before);
    });

    it('should refuse to overwrite the default <id>.drama.json on a second run', async () => {
        touch([`劇/${episodeFile('甲', 1)}`]);
        const cwd = process.cwd();
        process.chdir(root);
        try {
            expect((await runCli([join(root, '劇'), '--id', 'xyz'])).code).toBe(EXIT.ok);
            expect((await runCli([join(root, '劇'), '--id', 'xyz'])).code).toBe(EXIT.usage);
        } finally {
            process.chdir(cwd);
        }
    });

    it('should not write anything when generation is blocked', async () => {
        touch([...[1, 3].map((n) => `劇/${episodeFile('甲', n)}`)]);
        const outFile = join(root, 'x.drama.json');
        const { code, text } = await runCli([join(root, '劇'), '--out', outFile]);
        expect(code).toBe(EXIT.blocked);
        expect(text).toContain('缺第 2 集');
        expect(listFiles(root)).not.toContain('x.drama.json');
    });

    it('should exit "blocked" with an [錯誤] report for a null --existing file', async () => {
        touch([`劇/${episodeFile('甲', 1)}`]);
        writeFileSync(join(root, 'null.json'), 'null');
        const outFile = join(root, 'x.drama.json');
        const { code, text } = await runCli([
            join(root, '劇'),
            '--existing',
            join(root, 'null.json'),
            '--out',
            outFile,
        ]);
        expect(code).toBe(EXIT.blocked);
        expect(text).toContain('[錯誤]');
        expect(listFiles(root)).not.toContain('x.drama.json');
    });

    it('should exit with a distinct "internal" code on an unexpected error', async () => {
        touch([`劇/${episodeFile('甲', 1)}`]);
        const out: string[] = [];
        const code = await run([join(root, '劇'), '--out', join(root, 'x.json')], {
            out: (s: string) => out.push(s),
            now: () => new Date(Number.NaN),
        });
        expect(EXIT.internal).toBe(4);
        expect(code).toBe(EXIT.internal);
        expect(out.join('\n')).toContain('程式出錯');
    });

    it('should reject a missing folder or unknown option', async () => {
        expect((await runCli([join(root, 'nope')])).code).toBe(EXIT.usage);
        expect((await runCli([])).code).toBe(EXIT.usage);
        expect((await runCli([root, '--bogus'])).code).toBe(EXIT.usage);
    });
});

describe('script packaging', () => {
    it('should use the same R2 base as the app', () => {
        expect(DRAMA_AUDIO_BASE).toBe(APP_AUDIO_BASE);
    });

    it('should be self-contained: only node: built-in imports', () => {
        const source = readFileSync(SCRIPT, 'utf8');
        const imports = [...source.matchAll(/^import .* from '([^']+)';$/gm)].map((m) => m[1]);
        expect(imports.length).toBeGreaterThan(0);
        expect(imports.every((spec) => spec?.startsWith('node:'))).toBe(true);
        expect(source).not.toMatch(/\brequire\(/);
    });
});
