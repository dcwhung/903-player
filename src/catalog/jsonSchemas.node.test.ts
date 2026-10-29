// @vitest-environment node
// 要用 node:fs 讀 schemas/ 同資料 folder：*.node.test.ts 行 tsconfig.node.json（有 Node 型別）
import { readdirSync, readFileSync } from 'node:fs';
import type { ValidateFunction } from 'ajv';
import { DAILY_TOKENS, parseDramaDefinition, SERIES_TOKENS } from '../dramas/schema';
import { parseShowDefinition } from '../shows/schema';
import { compileSchema } from '../../tests/jsonSchemas';

/*
 * schemas/*.schema.json（editor 自動完成 + 即時驗證用）同 runtime validator（dramas/shows schema.ts）
 * 要講同一套規則：同一批例子，兩邊一齊收或者一齊拒；刻意唔同嘅位寫晒喺 DIVERGENCES 表。
 */
const ROOT = new URL('../../', import.meta.url);
const SRC = new URL('src/', ROOT);

type Json = Record<string, unknown>;
type Parser = (value: unknown, ctx: { id: string; source: string; files: Set<string> }) => unknown;

const readJson = (url: URL): Json => JSON.parse(readFileSync(url, 'utf8')) as Json;

const dramaSchema = compileSchema('drama');
const showSchema = compileSchema('show');

const IMAGES = new Set(['tile.webp', 'disc.webp', 'arc-disc.webp', 'arc-tile.webp']);
const ctxOf = (files: Set<string> = IMAGES) => ({ id: 'sample', source: 'sample.json', files });

const runtimeAccepts = (parse: Parser, value: unknown, files?: Set<string>): boolean => {
    try {
        parse(value, ctxOf(files));
        return true;
    } catch {
        return false;
    }
};

const clone = <T>(value: T): T => structuredClone(value);

const THEME: Json = {
    bg: '#f7e7b4',
    surface: '#fdf3d3',
    track: '#e8c869',
    accent: '#f2c21b',
    onAccent: '#3a2600',
    title: '#7f5500',
    text: '#3b2a0e',
    muted: '#6b5121',
    shadowDark: '#e0c77e',
    shadowLight: '#FFF8E2',
};

const FULL_THEME: Json = {
    ...THEME,
    accentText: '#7f5500',
    statusBar: '#8a5c00',
    scheme: 'light',
    titleFont: "'Noto Serif TC', serif",
    headerRule: 'linear-gradient(#c0362c, #c0362c) 0 100% / 100% 1px no-repeat',
};

const SERIES: Json = {
    name: '黃金少年',
    kind: 'series',
    enabled: true,
    order: 3,
    arcUnit: 'season',
    addedAt: '2026-10-24',
    tile: 'tile.webp',
    disc: 'disc.webp',
    audio: {
        host: 'r2',
        folder: '黃金少年',
        file: '{no2} - {folder}{arc} - 第{noZh}集[ - {title}].m4a',
    },
    theme: FULL_THEME,
    arcs: [
        {
            name: 'Season 1',
            disc: 'arc-disc.webp',
            tile: 'arc-tile.webp',
            addedAt: '2026-10-25',
            firstNo: 0,
            episodes: ['前傳', null, ''],
            titles: { '1': '中篇' },
            files: { '2': 'odd name.m4a' },
        },
        { name: 'Season 2', episodes: 3 },
    ],
};

const DAILY: Json = {
    name: '18 樓 C 座',
    kind: 'daily',
    enabled: false,
    tile: 'tile.webp',
    disc: 'disc.webp',
    audio: { host: 'app', folder: 'c18', file: '{yyyymmdd}-{date}-{folder}.m4a' },
    theme: THEME,
    episodes: [{ date: '2026-10-23' }, { date: '2025-08-13', rerun: true, file: 'old.m4a' }],
};

const SHOW: Json = {
    name: 'Bad Girl大過佬',
    fileTime: '1009',
    airDays: [1, 2, 3, 4, 5],
    order: 1,
    tile: 'tile.webp',
    disc: 'disc.webp',
    theme: FULL_THEME,
};

/** 基本例子 + 一個改動（path 用 . 分隔，array index 都得；value undefined = 刪走個 key） */
const withChange = (base: Json, path: string, value: unknown): Json => {
    const result = clone(base);
    const keys = path.split('.');
    const last = keys.pop() ?? '';
    const parent = keys.reduce<Json>((node, key) => node[key] as Json, result);
    if (value === undefined) delete parent[last];
    else parent[last] = value;
    return result;
};

type Case = [label: string, base: Json, path: string, value: unknown];

const DRAMA_INVALID: Case[] = [
    ['冇 name', SERIES, 'name', undefined],
    ['name 空字串', SERIES, 'name', ''],
    ['冇 kind', SERIES, 'kind', undefined],
    ['kind 唔係 series / daily', SERIES, 'kind', 'weekly'],
    ['enabled 唔係 boolean', SERIES, 'enabled', 'yes'],
    ['order 有小數', SERIES, 'order', 1.5],
    ['order 係字串', SERIES, 'order', '1'],
    ['arcUnit 唔識', SERIES, 'arcUnit', 'chapter'],
    ['冇 tile', SERIES, 'tile', undefined],
    ['disc 空字串', SERIES, 'disc', ''],
    ['冇 audio', SERIES, 'audio', undefined],
    ['audio.host 唔識', SERIES, 'audio.host', 's3'],
    ['冇 audio.folder', SERIES, 'audio.folder', undefined],
    ['audio.file 空字串', SERIES, 'audio.file', ''],
    ['series template 用每日 token', SERIES, 'audio.file', '{date}.m4a'],
    ['series template token 打錯', SERIES, 'audio.file', '{no3}.m4a'],
    ['daily template 用 series token', DAILY, 'audio.file', '{no}.m4a'],
    ['冇 theme', SERIES, 'theme', undefined],
    ['theme 色唔係 hex', SERIES, 'theme.bg', 'red'],
    ['theme 色用三位 hex', SERIES, 'theme.accent', '#fff'],
    ['theme 冇必填色', SERIES, 'theme.muted', undefined],
    ['theme.statusBar 唔係 hex', SERIES, 'theme.statusBar', 'rgb(0, 0, 0)'],
    ['theme.scheme 唔識', SERIES, 'theme.scheme', 'dark'],
    ['theme.titleFont 空字串', SERIES, 'theme.titleFont', ''],
    ['addedAt 唔存在嘅日子', SERIES, 'addedAt', '2026-02-30'],
    ['addedAt 用斜線', SERIES, 'addedAt', '2026/10/24'],
    ['addedAt 年份 < 0100（Date.UTC 會當 19xx）', SERIES, 'addedAt', '0099-01-01'],
    ['series 冇 arcs', SERIES, 'arcs', undefined],
    ['arcs 空 list', SERIES, 'arcs', []],
    ['arc 冇 name', SERIES, 'arcs.1.name', undefined],
    ['arc episodes 係 0', SERIES, 'arcs.1.episodes', 0],
    ['arc episodes 有小數', SERIES, 'arcs.1.episodes', 2.5],
    ['arc episodes 空 list', SERIES, 'arcs.1.episodes', []],
    ['arc episodes list 有數字', SERIES, 'arcs.1.episodes', ['a', 1]],
    ['arc firstNo 負數', SERIES, 'arcs.1.firstNo', -1],
    ['arc titles key 唔係集數', SERIES, 'arcs.0.titles', { x: '集名' }],
    ['arc titles 集名空字串', SERIES, 'arcs.0.titles', { '1': '' }],
    ['arc files 唔係 object', SERIES, 'arcs.0.files', ['a.m4a']],
    ['arc disc 空字串', SERIES, 'arcs.0.disc', ''],
    ['arc addedAt 格式錯', SERIES, 'arcs.0.addedAt', '24-10-2026'],
    ['daily 冇 episodes', DAILY, 'episodes', undefined],
    ['daily episodes 空 list', DAILY, 'episodes', []],
    ['daily episode 冇 date', DAILY, 'episodes.0', { rerun: true }],
    ['daily episode date 唔存在', DAILY, 'episodes.0.date', '2025-13-01'],
    ['daily episode rerun 係字串', DAILY, 'episodes.1.rerun', 'true'],
    ['daily episode file 空字串', DAILY, 'episodes.1.file', ''],
];

const DRAMA_VALID: Case[] = [
    ['齊晒 optional 欄位嘅 series', SERIES, 'name', '黃金少年'],
    ['齊晒 optional 欄位嘅 daily', DAILY, 'name', '18 樓 C 座'],
    ['冇 order / arcUnit', withChange(SERIES, 'order', undefined), 'arcUnit', undefined],
    ['order 係 0', SERIES, 'order', 0],
    ['order 負數', SERIES, 'order', -1],
    ['daily 都可以有 arcUnit', DAILY, 'arcUnit', 'season'],
    ['閏年 2 月 29 號', SERIES, 'addedAt', '2024-02-29'],
    ['年份 0100', SERIES, 'addedAt', '0100-01-01'],
    ['template 冇 token', SERIES, 'audio.file', 'fixed.m4a'],
    ['template 有唔成 token 嘅 {', SERIES, 'audio.file', 'a{b.m4a {} {-}'],
    ['template 雙重括號', SERIES, 'audio.file', '{{no}}.m4a'],
    ['arc episodes 全部 null', SERIES, 'arcs.1.episodes', [null, null]],
    ['titles 係空 object', SERIES, 'arcs.0.titles', {}],
    ['daily episode rerun false', DAILY, 'episodes.0.rerun', false],
    ['加 $schema 指返 schema', SERIES, '$schema', '../../../schemas/drama.schema.json'],
];

const SHOW_INVALID: Case[] = [
    ['冇 name', SHOW, 'name', undefined],
    ['fileTime 2400', SHOW, 'fileTime', '2400'],
    ['fileTime 三位', SHOW, 'fileTime', '930'],
    ['fileTime 分鐘 60', SHOW, 'fileTime', '0960'],
    ['fileTime 係數字', SHOW, 'fileTime', 1009],
    ['airDays 空 list', SHOW, 'airDays', []],
    ['airDays 有 7', SHOW, 'airDays', [7]],
    ['airDays 有負數', SHOW, 'airDays', [-1]],
    ['airDays 重複', SHOW, 'airDays', [1, 1]],
    ['airDays 有小數', SHOW, 'airDays', [1.5]],
    ['order 係字串', SHOW, 'order', '1'],
    ['冇 tile', SHOW, 'tile', undefined],
    ['theme 色錯', SHOW, 'theme.text', '#12345g'],
];

const SHOW_VALID: Case[] = [
    ['齊晒 optional 欄位', SHOW, 'name', 'Bad Girl大過佬'],
    ['冇 order、theme 冇 optional', withChange(SHOW, 'order', undefined), 'theme', THEME],
    ['fileTime 0000', SHOW, 'fileTime', '0000'],
    ['fileTime 2359', SHOW, 'fileTime', '2359'],
    ['airDays 星期日同星期六', SHOW, 'airDays', [6, 0]],
];

describe('catalog JSON schemas', () => {
    describe('現有資料檔全部合格', () => {
        const folders = (kind: string) =>
            readdirSync(new URL(`${kind}/`, SRC), { withFileTypes: true })
                .filter((entry) => entry.isDirectory())
                .map((entry) => entry.name);

        it.each(folders('dramas'))('should accept src/dramas/%s/drama.json', (id) => {
            const data = readJson(new URL(`dramas/${id}/drama.json`, SRC));
            expect(dramaSchema(data), JSON.stringify(dramaSchema.errors)).toBe(true);
        });

        it.each(folders('shows'))('should accept src/shows/%s/show.json', (id) => {
            const data = readJson(new URL(`shows/${id}/show.json`, SRC));
            expect(showSchema(data), JSON.stringify(showSchema.errors)).toBe(true);
        });
    });

    const both = (schema: ValidateFunction, parse: Parser, value: Json) => ({
        schema: schema(value),
        runtime: runtimeAccepts(parse, value),
    });

    it.each(DRAMA_INVALID)('drama: should reject %s in both', (_label, base, path, value) => {
        const verdict = both(dramaSchema, parseDramaDefinition, withChange(base, path, value));
        expect(verdict).toEqual({ schema: false, runtime: false });
    });

    it.each(DRAMA_VALID)('drama: should accept %s in both', (_label, base, path, value) => {
        const verdict = both(dramaSchema, parseDramaDefinition, withChange(base, path, value));
        expect(verdict, JSON.stringify(dramaSchema.errors)).toEqual({
            schema: true,
            runtime: true,
        });
    });

    it.each(SHOW_INVALID)('show: should reject %s in both', (_label, base, path, value) => {
        const verdict = both(showSchema, parseShowDefinition, withChange(base, path, value));
        expect(verdict).toEqual({ schema: false, runtime: false });
    });

    it.each(SHOW_VALID)('show: should accept %s in both', (_label, base, path, value) => {
        const verdict = both(showSchema, parseShowDefinition, withChange(base, path, value));
        expect(verdict, JSON.stringify(showSchema.errors)).toEqual({ schema: true, runtime: true });
    });

    describe('逐個欄位刪走：必填 / optional 兩邊一致', () => {
        const objects: [string, Json, string][] = [
            ['drama', SERIES, ''],
            ['drama', SERIES, 'theme'],
            ['drama', SERIES, 'audio'],
            ['drama', SERIES, 'arcs.0'],
            ['drama', DAILY, ''],
            ['drama', DAILY, 'episodes.1'],
            ['show', SHOW, ''],
        ];
        const nodeAt = (base: Json, prefix: string): Json =>
            prefix === '' ? base : prefix.split('.').reduce<Json>((n, k) => n[k] as Json, base);
        const cases = objects.flatMap(([kind, base, prefix]) =>
            Object.keys(nodeAt(base, prefix)).map((key): [string, string, Json] => [
                kind,
                prefix ? `${prefix}.${key}` : key,
                base,
            ]),
        );

        it.each(cases)('%s: deleting %s gives the same verdict', (kind, path, base) => {
            const value = withChange(base, path, undefined);
            const verdict =
                kind === 'show'
                    ? both(showSchema, parseShowDefinition, value)
                    : both(dramaSchema, parseDramaDefinition, value);
            expect(verdict.schema).toBe(verdict.runtime);
        });
    });

    describe('template token 同 runtime 個 set 一致', () => {
        it.each([...SERIES_TOKENS])('series: should accept {%s}', (token) => {
            expect(dramaSchema(withChange(SERIES, 'audio.file', `{${token}}.m4a`))).toBe(true);
        });

        it.each([...DAILY_TOKENS])('daily: should accept {%s}', (token) => {
            expect(dramaSchema(withChange(DAILY, 'audio.file', `{${token}}.m4a`))).toBe(true);
        });
    });

    // 兩份 schema 各自抄一份 theme（唔用跨檔 $ref，editor 解析最穩陣），呢度鎖住唔好走樣
    it.each(['theme', 'hexColour', 'nonEmptyString'])(
        'should keep definitions.%s identical in both schemas',
        (key) => {
            const definitionOf = (name: string) =>
                (readJson(new URL(`schemas/${name}.schema.json`, ROOT)).definitions as Json)[key];
            expect(definitionOf('drama')).toEqual(definitionOf('show'));
        },
    );

    /*
     * 刻意唔同：schema 嚴過 runtime（打錯 key 喺 editor 即刻見到；runtime 唔理多出嚟嘅 key），
     * 或者 JSON Schema 表達唔到（要睇 folder 檔案 / 跨項比較），淨係 runtime 驗。
     */
    describe('DIVERGENCES（已知、刻意）', () => {
        const SCHEMA_ONLY: Case[] = [
            ['多出嚟嘅 key（例如打錯 enabeld）', SERIES, 'enabeld', true],
            ['theme 多出嚟嘅 key', SERIES, 'theme.background', '#000000'],
            ['daily 寫咗 series 先用嘅 arcs', DAILY, 'arcs', SERIES.arcs],
            ['daily 寫咗 series 先用嘅 addedAt', DAILY, 'addedAt', '2026-10-24'],
            ['series 寫咗 daily 先用嘅 episodes', SERIES, 'episodes', DAILY.episodes],
            ['titles key 有前置 0', SERIES, 'arcs.0.titles', { '01': '中篇' }],
            ['show 多出嚟嘅 key', SHOW, 'airday', [1]],
        ];

        it.each(SCHEMA_ONLY)('schema only: should reject %s', (_label, base, path, value) => {
            const value2 = withChange(base, path, value);
            const parse = base === SHOW ? parseShowDefinition : parseDramaDefinition;
            const schema = base === SHOW ? showSchema : dramaSchema;
            expect(both(schema, parse, value2)).toEqual({ schema: false, runtime: true });
        });

        const RUNTIME_ONLY: Case[] = [
            ['圖檔唔喺 folder', SERIES, 'tile', 'missing.webp'],
            ['arc 圖檔唔喺 folder', SERIES, 'arcs.0.disc', 'missing.webp'],
            ['arc name 重複', SERIES, 'arcs.1.name', 'Season 1'],
            ['titles 集數超出範圍', SERIES, 'arcs.1.titles', { '9': '集名' }],
            ['files 集數超出範圍', SERIES, 'arcs.1.files', { '0': 'a.m4a' }],
            ['daily date 重複', DAILY, 'episodes.1.date', '2026-10-23'],
        ];

        it.each(RUNTIME_ONLY)('runtime only: should reject %s', (_label, base, path, value) => {
            const verdict = both(dramaSchema, parseDramaDefinition, withChange(base, path, value));
            expect(verdict).toEqual({ schema: true, runtime: false });
        });

        it('runtime only: should reject a folder id that is not kebab-case', () => {
            const ctx = { ...ctxOf(), id: 'Bad_Id' };
            expect(() => parseShowDefinition(clone(SHOW), ctx)).toThrow(/folder name/);
            expect(showSchema(SHOW)).toBe(true);
        });
    });
});
