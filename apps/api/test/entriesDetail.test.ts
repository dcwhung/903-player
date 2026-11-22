/* GET /api/entries?detail=1（AU-024）：一個 response 回晒每個 entry 嘅全文，admin 唔使再逐個 GET */
import { env } from 'cloudflare:test';
import { adminGet, adminPost, call } from './helpers';
import { drama, putEntry, seed } from './fixtures';

type Json = Record<string, unknown>;

const DETAIL_PATH = '/api/entries?detail=1';
const EXTRA_DRAMAS = 4;

const detailEntries = async (bindings = env): Promise<Json[]> => {
    const response = await adminGet(DETAIL_PATH, bindings);
    expect(response.status).toBe(200);
    return ((await response.json()) as { entries: Json[] }).entries;
};

/** 記低每條 prepare 嘅 SQL（數 D1 query） */
const countingEnv = () => {
    const statements: string[] = [];
    const DB = new Proxy(env.DB, {
        get(target, property) {
            if (property === 'prepare')
                return (sql: string) => {
                    statements.push(sql);
                    return target.prepare(sql);
                };
            const value: unknown = Reflect.get(target, property);
            return typeof value === 'function'
                ? (value as (...args: unknown[]) => unknown).bind(target)
                : value;
        },
    });
    return { bindings: { ...env, DB }, statements };
};

const entryReads = (statements: readonly string[]) =>
    statements.filter((sql) => /FROM entries\b/.test(sql));

/** 單一 entry GET 嘅 body + etag（detail 列表每個 entry 要同佢一樣） */
const single = async (kind: unknown, id: unknown) => {
    const response = await adminGet(`/api/entries/${String(kind)}/${String(id)}`);
    return { body: (await response.json()) as Json, etag: response.headers.get('etag') };
};

beforeEach(() => seed(3));

describe('GET /api/entries?detail=1', () => {
    it('should return the list fields plus the full record of every entry', async () => {
        const entries = await detailEntries();
        expect(entries.map((entry) => [entry.kind, entry.id])).toEqual([
            ['dramas', 'golden'],
            ['shows', 'badgirl'],
        ]);
        expect(entries[0]).toEqual({
            kind: 'dramas',
            id: 'golden',
            name: '黃金少年',
            enabled: true,
            draft: false,
            updatedAt: '2026-11-08T00:00:00Z',
            published: false,
            publishedArcs: [],
            definition: drama(3),
            images: { 'tile.webp': '0123456789abcdef.webp', 'disc.webp': 'fedcba9876543210.webp' },
            etag: '"2026-11-08T00:00:00Z"',
            publishedVersion: null,
        });
    });

    it('should match the single entry GET for every entry, published version included', async () => {
        await adminPost('/api/publish');
        await putEntry('dramas', 'golden', { ...drama(3), summary: '改咗未發佈' });
        const entries = await detailEntries();
        expect(entries).toHaveLength(2);
        for (const entry of entries) {
            const { body, etag } = await single(entry.kind, entry.id);
            expect(entry).toMatchObject({
                definition: body.definition,
                images: body.images,
                draft: body.draft,
                updatedAt: body.updatedAt,
                publishedVersion: body.published,
                etag,
                published: true,
            });
            expect(body.published).not.toBeNull();
        }
    });

    it('should read the entries table once, however many entries there are', async () => {
        const few = countingEnv();
        await detailEntries(few.bindings);
        for (let n = 0; n < EXTRA_DRAMAS; n += 1)
            await putEntry('dramas', `extra-${String(n)}`, {
                ...drama(2),
                name: `劇 ${String(n)}`,
            });
        const many = countingEnv();
        expect(await detailEntries(many.bindings)).toHaveLength(2 + EXTRA_DRAMAS);
        expect(entryReads(many.statements)).toHaveLength(1);
        expect(many.statements).toHaveLength(few.statements.length);
    });

    it('should answer 401 without a session', async () => {
        expect((await call(DETAIL_PATH)).status).toBe(401);
    });
});

describe('GET /api/entries without detail=1', () => {
    const PLAIN =
        '{"entries":[' +
        '{"kind":"dramas","id":"golden","name":"黃金少年","enabled":true,"draft":false,' +
        '"updatedAt":"2026-11-08T00:00:00Z","published":false,"publishedArcs":[]},' +
        '{"kind":"shows","id":"badgirl","name":"Bad Girl大過佬","enabled":true,"draft":false,' +
        '"updatedAt":"2026-11-08T00:00:00Z","published":false}]}';

    it.each(['/api/entries', '/api/entries?detail=0', '/api/entries?detail=true'])(
        'should keep the plain list response unchanged for %s',
        async (path) => {
            expect(await (await adminGet(path)).text()).toBe(PLAIN);
        },
    );
});
