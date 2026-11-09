// @vitest-environment node
/*
 * scripts/importLibrary.mjs：repo library/ → D1 SQL + R2 上載。最重要係 idempotent：
 * 同一份 library 重跑 SQL，D1 一行都唔變（真 D1 = miniflare，套同一個 migration）
 */
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { convertV4MiniflareOptions, Miniflare } from 'miniflare';
import { scanLibrary } from '../../player/scripts/buildCatalogJson.mjs';
import { importSql, planImport, run, uploadCommands, type ImportPlan } from './importLibrary.mjs';

const MIGRATION = new URL('../migrations/0001_init.sql', import.meta.url);
const NOW = '2026-11-08T12:00:00.000Z';
const LATER = '2026-11-09T12:00:00.000Z';
const COMPATIBILITY_DATE = '2026-11-01';

/** migration 拆做逐句（`;` 結尾嗰行為止），去咗 -- 註解 */
const statements = (sql: string): string[] =>
    sql
        .split('\n')
        .filter((line) => !line.trim().startsWith('--'))
        .join('\n')
        .split(/;\s*\n/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

const newDatabase = async () => {
    // miniflare v5 新 option 格式好長，用官方 converter 寫返 v4 格式
    const mf = new Miniflare(
        convertV4MiniflareOptions({
            modules: true,
            script: 'export default { fetch: () => new Response() };',
            compatibilityDate: COMPATIBILITY_DATE,
            d1Databases: { DB: 'import-test' },
        }),
    );
    const db = await mf.getD1Database('DB');
    await db.batch(statements(readFileSync(MIGRATION, 'utf8')).map((s) => db.prepare(s)));
    return { mf, db };
};

type Db = Awaited<ReturnType<typeof newDatabase>>['db'];

const execute = (db: Db, sql: string) => db.batch(statements(sql).map((s) => db.prepare(s)));

const dump = async (db: Db) => ({
    entries: (await db.prepare('SELECT * FROM entries ORDER BY kind, id').all()).results,
    assets: (await db.prepare('SELECT * FROM assets ORDER BY hash').all()).results,
});

describe('planImport', () => {
    const library = scanLibrary();
    const plan: ImportPlan = planImport(library);

    it('should plan every show and drama with its definition unchanged', () => {
        expect(plan.entries.filter((e) => e.kind === 'shows').map((e) => e.id)).toEqual(
            library.shows.map((s) => s.id),
        );
        expect(plan.entries.filter((e) => e.kind === 'dramas').map((e) => e.id)).toEqual(
            library.dramas.map((d) => d.id),
        );
        expect(plan.entries[0]?.definition).toEqual(library.shows[0]?.definition);
    });

    it('should name every image by the first 16 hex of its SHA-256', () => {
        const [image] = library.dramas[0]?.images ?? [];
        const hash = createHash('sha256')
            .update(readFileSync(image?.path ?? ''))
            .digest('hex');
        const entry = plan.entries.find((e) => e.id === library.dramas[0]?.id);
        expect(entry?.images[image?.file ?? '']).toBe(`${hash.slice(0, 16)}.webp`);
        expect(plan.assets.find((a) => a.hash === hash.slice(0, 16))).toMatchObject({
            key: `catalog/v1/img/${hash.slice(0, 16)}.webp`,
            contentType: 'image/webp',
            path: image?.path,
        });
    });

    it('should upload identical images only once', () => {
        const hashes = plan.assets.map((a) => a.hash);
        expect(new Set(hashes).size).toBe(hashes.length);
        const referenced = new Set(plan.entries.flatMap((e) => Object.values(e.images)));
        expect(new Set(plan.assets.map((a) => `${a.hash}.${a.key.split('.').at(-1)}`))).toEqual(
            referenced,
        );
    });

    it('should give show .jpg images the jpeg content type', () => {
        const jpg = plan.assets.find((a) => a.key.endsWith('.jpg'));
        if (jpg) expect(jpg.contentType).toBe('image/jpeg');
    });
});

describe('importSql', () => {
    const plan = planImport(scanLibrary());

    it('should be idempotent: running it twice leaves D1 exactly the same', async () => {
        const { mf, db } = await newDatabase();
        try {
            await execute(db, importSql(plan, { now: NOW }));
            const first = await dump(db);
            await execute(db, importSql(plan, { now: LATER }));
            expect(await dump(db)).toEqual(first);
            expect(first.entries).toHaveLength(plan.entries.length);
            expect(first.assets).toHaveLength(plan.assets.length);
        } finally {
            await mf.dispose();
        }
    });

    it('should update a changed definition and only touch that row', async () => {
        const { mf, db } = await newDatabase();
        try {
            await execute(db, importSql(plan, { now: NOW }));
            const [first, ...rest] = plan.entries;
            const changed = { ...first!, definition: { ...first!.definition, name: '改咗' } };
            await execute(db, importSql({ ...plan, entries: [changed, ...rest] }, { now: LATER }));
            const rows = (await dump(db)).entries as {
                id: string;
                updated_at: string;
                definition: string;
            }[];
            const row = rows.find((r) => r.id === first!.id);
            expect(JSON.parse(row?.definition ?? '{}').name).toBe('改咗');
            expect(row?.updated_at).toBe(LATER);
            expect(rows.filter((r) => r.updated_at === LATER)).toHaveLength(1);
        } finally {
            await mf.dispose();
        }
    });

    it('should escape single quotes in JSON text', async () => {
        const { mf, db } = await newDatabase();
        try {
            const entry = {
                kind: 'shows' as const,
                id: 'q',
                definition: { name: "it's" },
                images: {},
            };
            await execute(db, importSql({ entries: [entry], assets: [] }, { now: NOW }));
            const row = await db
                .prepare("SELECT definition FROM entries WHERE id = 'q'")
                .first<string>('definition');
            expect(JSON.parse(row ?? '{}')).toEqual({ name: "it's" });
        } finally {
            await mf.dispose();
        }
    });
});

describe('uploadCommands', () => {
    const asset = {
        hash: '0123456789abcdef',
        key: 'catalog/v1/img/0123456789abcdef.webp',
        path: '/repo/a b/disc.webp',
        contentType: 'image/webp',
        bytes: 10,
    };

    it('should put each object into the catalog bucket with its content type', () => {
        expect(uploadCommands([asset], 'remote')).toEqual([
            [
                'r2',
                'object',
                'put',
                '903-player-catalog/catalog/v1/img/0123456789abcdef.webp',
                '--file',
                '/repo/a b/disc.webp',
                '--content-type',
                'image/webp',
                '--remote',
            ],
        ]);
        expect(uploadCommands([asset], 'local')[0]?.at(-1)).toBe('--local');
    });
});

describe('importLibrary CLI', () => {
    const capture = () => {
        const lines: string[] = [];
        return { out: (text: string) => lines.push(text), text: () => lines.join('') };
    };

    it('should need exactly one of --local / --remote', async () => {
        expect(await run([], capture())).toBe(2);
        expect(await run(['--local', '--remote'], capture())).toBe(2);
        expect(await run(['--nope'], capture())).toBe(2);
    });

    it('should skip images D1 already lists and run SQL after the uploads', async () => {
        const plan = planImport(scanLibrary());
        const [known, ...others] = plan.assets;
        const calls: string[][] = [];
        const exec = (args: string[]) => {
            calls.push(args);
            const listing = [{ results: [{ hash: known?.hash }] }];
            return { status: 0, stdout: args.includes('--json') ? JSON.stringify(listing) : '' };
        };
        const io = capture();
        expect(await run(['--local', '--out-dir', '/tmp/import-test'], { ...io, exec })).toBe(0);
        const puts = calls.filter((a) => a[0] === 'r2');
        expect(puts).toHaveLength(others.length);
        expect(puts.some((a) => a[3]?.endsWith(known?.key ?? '-'))).toBe(false);
        expect(calls.at(-1)).toEqual([
            'd1',
            'execute',
            '903-player',
            '--local',
            '--file',
            '/tmp/import-test/import.sql',
        ]);
    });

    it('should only print the commands with --dry-run', async () => {
        const calls: string[][] = [];
        const io = capture();
        const exec = (args: string[]) => {
            calls.push(args);
            return { status: 0, stdout: '[{"results":[]}]' };
        };
        expect(
            await run(['--remote', '--dry-run', '--out-dir', '/tmp/import-dry'], { ...io, exec }),
        ).toBe(0);
        expect(calls.every((a) => a.includes('--json'))).toBe(true);
        expect(io.text()).toContain('wrangler r2 object put');
        expect(io.text()).toContain('wrangler d1 execute 903-player --remote --file');
    });

    it('should stop with exit 1 when wrangler fails', async () => {
        const exec = () => ({ status: 1, stdout: '' });
        expect(
            await run(['--local', '--out-dir', '/tmp/import-fail'], { ...capture(), exec }),
        ).toBe(1);
    });
});
