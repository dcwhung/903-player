// @vitest-environment node
/*
 * scripts/importLibrary.mjs：repo library/ → D1 SQL + R2 上載。最重要係（AU-017）：
 * 預設只加未有嘅 entries，D1 已有嘅行（admin 改過）一行都唔郁；--overwrite 先會蓋過；
 * 兩個 mode 重跑都係 no-op（真 D1 = miniflare，套同一個 migration）
 */
import { mkdtempSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { convertV4MiniflareOptions, Miniflare } from 'miniflare';
import { scanLibrary } from '../../player/scripts/buildCatalogJson.mjs';
import {
    countEntries,
    importSql,
    planImport,
    run,
    uploadCommands,
    type ImportEntry,
    type ImportPlan,
} from './importLibrary.mjs';

const MIGRATION = new URL('../migrations/0001_init.sql', import.meta.url);
const NOW = '2026-11-08T12:00:00.000Z';
const ADMIN_AT = '2026-11-08T18:00:00.000Z';
const LATER = '2026-11-09T12:00:00.000Z';
const EVEN_LATER = '2026-11-10T12:00:00.000Z';
const COMPATIBILITY_DATE = '2026-11-01';
/** miniflare 第一次起 workerd 好慢（--coverage 之下試過超過 vitest 預設 5 秒） */
const MINIFLARE_TEST_TIMEOUT_MS = 30_000;

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

describe('importSql', { timeout: MINIFLARE_TEST_TIMEOUT_MS }, () => {
    const plan = planImport(scanLibrary());
    const [edited, missing] = plan.entries;
    const ADMIN_DEFINITION = JSON.stringify({ name: 'admin 改過' });
    const ADMIN_IMAGES = JSON.stringify({ 'disc.webp': 'aaaaaaaaaaaaaaaa.webp' });

    interface EntryRow {
        kind: string;
        id: string;
        definition: string;
        images: string;
        updated_at: string;
    }

    const entryRows = async (db: Db) => (await dump(db)).entries as unknown as EntryRow[];

    const rowOf = (rows: EntryRow[], entry: ImportEntry | undefined) =>
        rows.find((r) => r.kind === entry?.kind && r.id === entry.id);

    /** import 一次（NOW）之後：admin 改咗第一行（ADMIN_AT）、第二行喺 D1 唔存在 */
    const seedWithAdminEdit = async (db: Db) => {
        await execute(db, importSql(plan, { now: NOW }));
        await db
            .prepare(
                'UPDATE entries SET definition = ?, images = ?, updated_at = ? WHERE kind = ? AND id = ?',
            )
            .bind(ADMIN_DEFINITION, ADMIN_IMAGES, ADMIN_AT, edited!.kind, edited!.id)
            .run();
        await db
            .prepare('DELETE FROM entries WHERE kind = ? AND id = ?')
            .bind(missing!.kind, missing!.id)
            .run();
    };

    it.each([{ overwrite: false }, { overwrite: true }])(
        'should be idempotent: running it twice leaves D1 exactly the same (overwrite: $overwrite)',
        async ({ overwrite }) => {
            const { mf, db } = await newDatabase();
            try {
                await execute(db, importSql(plan, { now: NOW, overwrite }));
                const first = await dump(db);
                await execute(db, importSql(plan, { now: LATER, overwrite }));
                expect(await dump(db)).toEqual(first);
                expect(first.entries).toHaveLength(plan.entries.length);
                expect(first.assets).toHaveLength(plan.assets.length);
            } finally {
                await mf.dispose();
            }
        },
    );

    it('should leave a row admin changed untouched and still insert missing rows by default', async () => {
        const { mf, db } = await newDatabase();
        try {
            await seedWithAdminEdit(db);
            await execute(db, importSql(plan, { now: LATER }));
            const rows = await entryRows(db);
            expect(rowOf(rows, edited)).toMatchObject({
                definition: ADMIN_DEFINITION,
                images: ADMIN_IMAGES,
                updated_at: ADMIN_AT,
            });
            expect(rowOf(rows, missing)).toMatchObject({
                definition: JSON.stringify(missing!.definition),
                images: JSON.stringify(missing!.images),
                updated_at: LATER,
            });
            expect(rows).toHaveLength(plan.entries.length);
            expect(rows.filter((r) => r.updated_at === LATER)).toHaveLength(1);
        } finally {
            await mf.dispose();
        }
    });

    it('should stay a no-op when the default import is re-run over admin edits', async () => {
        const { mf, db } = await newDatabase();
        try {
            await seedWithAdminEdit(db);
            await execute(db, importSql(plan, { now: LATER }));
            const first = await dump(db);
            await execute(db, importSql(plan, { now: EVEN_LATER }));
            expect(await dump(db)).toEqual(first);
        } finally {
            await mf.dispose();
        }
    });

    it('should replace a row admin changed with overwrite and only touch rows that differ', async () => {
        const { mf, db } = await newDatabase();
        try {
            await seedWithAdminEdit(db);
            await execute(db, importSql(plan, { now: LATER, overwrite: true }));
            const rows = await entryRows(db);
            expect(rowOf(rows, edited)).toMatchObject({
                definition: JSON.stringify(edited!.definition),
                images: JSON.stringify(edited!.images),
                updated_at: LATER,
            });
            expect(rowOf(rows, missing)?.updated_at).toBe(LATER);
            expect(rows.filter((r) => r.updated_at === LATER)).toHaveLength(2);
            const first = await dump(db);
            await execute(db, importSql(plan, { now: EVEN_LATER, overwrite: true }));
            expect(await dump(db)).toEqual(first);
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

    describe('entry outcome', () => {
        const plan = planImport(scanLibrary());
        const [edited, missing, ...same] = plan.entries;
        const asRow = (entry: ImportEntry) => ({
            kind: entry.kind,
            id: entry.id,
            definition: JSON.stringify(entry.definition),
            images: JSON.stringify(entry.images),
        });
        /** D1：第一行 admin 改過、第二行唔存在、其餘同 repo 一樣，另加一行 repo 冇嘅（admin 新增） */
        const d1Entries = [
            { ...asRow(edited!), definition: '{"name":"admin 改過"}' },
            ...same.map(asRow),
            { kind: 'dramas', id: 'admin-only', definition: '{}', images: '{}' },
        ];
        const execWith = (calls: string[][]) => (args: string[]) => {
            calls.push(args);
            const rows = args.at(-1)?.includes('FROM entries') ? d1Entries : [];
            return { status: 0, stdout: JSON.stringify([{ results: rows }]) };
        };
        const newOutDir = () => mkdtempSync(join(tmpdir(), 'import-'));
        const sqlOf = (dir: string) => readFileSync(join(dir, 'import.sql'), 'utf8');

        it('should count entries to insert, differing and unchanged', () => {
            expect(missing).toBeDefined();
            expect(countEntries(plan.entries, d1Entries)).toEqual({
                missing: 1,
                changed: 1,
                unchanged: same.length,
            });
            expect(countEntries(plan.entries, [])).toEqual({
                missing: plan.entries.length,
                changed: 0,
                unchanged: 0,
            });
        });

        it('should report inserted vs kept rows and write insert-only SQL by default', async () => {
            const calls: string[][] = [];
            const io = capture();
            const dir = newOutDir();
            const argv = ['--remote', '--dry-run', '--out-dir', dir];
            expect(await run(argv, { ...io, exec: execWith(calls) })).toBe(0);
            expect(calls.every((a) => a.includes('--json'))).toBe(true);
            expect(io.text()).toContain(
                `entries: 1 to insert, ${same.length + 1} existing kept (1 differ from the repo library)\n`,
            );
            expect(io.text()).toContain('existing entries are never modified');
            expect(io.text()).not.toContain('WARNING');
            expect(sqlOf(dir)).toContain('ON CONFLICT (kind, id) DO NOTHING;');
            expect(sqlOf(dir)).not.toContain('DO UPDATE');
        });

        it('should report rows to overwrite, warn and write upsert SQL with --overwrite', async () => {
            const calls: string[][] = [];
            const io = capture();
            const dir = newOutDir();
            const argv = ['--overwrite', '--remote', '--dry-run', '--out-dir', dir];
            expect(await run(argv, { ...io, exec: execWith(calls) })).toBe(0);
            expect(calls.every((a) => a.includes('--json'))).toBe(true);
            expect(io.text()).toContain(
                `entries: 1 to insert, 1 to overwrite, ${same.length} unchanged\n`,
            );
            expect(io.text()).toContain(
                'WARNING: --overwrite replaces 1 existing entries with the repo library version',
            );
            expect(io.text()).toContain('schedules');
            expect(sqlOf(dir)).toContain('ON CONFLICT (kind, id) DO UPDATE SET');
        });

        it('should keep the counts line first for the workflow summary', async () => {
            const io = capture();
            const argv = ['--local', '--dry-run', '--out-dir', newOutDir()];
            expect(await run(argv, { ...io, exec: execWith([]) })).toBe(0);
            expect(io.text().split('\n')[0]).toMatch(/^\d+ entries, \d+ images \(\d+ to upload\)$/);
        });

        it('should run the SQL last when --overwrite is not a dry run', async () => {
            const calls: string[][] = [];
            const dir = newOutDir();
            const argv = ['--local', '--overwrite', '--out-dir', dir];
            expect(await run(argv, { ...capture(), exec: execWith(calls) })).toBe(0);
            expect(calls.at(-1)).toEqual([
                'd1',
                'execute',
                '903-player',
                '--local',
                '--file',
                join(dir, 'import.sql'),
            ]);
        });

        const isWrite = (args: string[]) => !args.includes('--json');
        const fileNames = (entries: readonly (ImportEntry | undefined)[]) =>
            new Set(entries.flatMap((entry) => Object.values(entry?.images ?? {})));
        const uploadedFileNames = (calls: string[][]) =>
            new Set(calls.filter((a) => a[0] === 'r2').map((a) => a[3]?.split('/').at(-1)));

        it('should only upload and record images of the entries it inserts by default', async () => {
            const calls: string[][] = [];
            const io = capture();
            const dir = newOutDir();
            expect(await run(['--local', '--out-dir', dir], { ...io, exec: execWith(calls) })).toBe(
                0,
            );
            const wanted = fileNames([missing]);
            expect(wanted.size).toBeGreaterThan(0);
            expect(wanted.size).toBeLessThan(plan.assets.length);
            expect(uploadedFileNames(calls)).toEqual(wanted);
            const sql = sqlOf(dir).split('\n');
            expect(sql.filter((line) => line.startsWith('INSERT INTO entries'))).toHaveLength(1);
            expect(sql.filter((line) => line.startsWith('INSERT INTO assets'))).toHaveLength(
                wanted.size,
            );
            expect(io.text().split('\n')[0]).toBe(
                `${plan.entries.length} entries, ${plan.assets.length} images (${wanted.size} to upload)`,
            );
        });

        it('should still upload every missing image with --overwrite', async () => {
            const calls: string[][] = [];
            const argv = ['--local', '--overwrite', '--out-dir', newOutDir()];
            expect(await run(argv, { ...capture(), exec: execWith(calls) })).toBe(0);
            expect(uploadedFileNames(calls)).toEqual(fileNames(plan.entries));
        });

        it('should write nothing by default when D1 already has every entry', async () => {
            const calls: string[][] = [];
            const io = capture();
            const exec = (args: string[]) => {
                calls.push(args);
                const rows = args.at(-1)?.includes('FROM entries') ? plan.entries.map(asRow) : [];
                return { status: 0, stdout: JSON.stringify([{ results: rows }]) };
            };
            expect(await run(['--local', '--out-dir', newOutDir()], { ...io, exec })).toBe(0);
            expect(calls.filter(isWrite)).toEqual([]);
            expect(io.text()).toContain(
                `entries: 0 to insert, ${plan.entries.length} existing kept (0 differ from the repo library)\n`,
            );
        });

        describe.each([
            { name: 'an empty array', stdout: '[]' },
            { name: 'a failed result', stdout: '[{"success":false,"error":"x"}]' },
            { name: 'null results', stdout: '[{"results":null}]' },
            { name: 'non-JSON text', stdout: 'Proxy error <html>' },
        ])('when a D1 read returns $name', ({ stdout }) => {
            const good = JSON.stringify([{ results: [] }]);
            const failingReads = (calls: string[][]) => (args: string[]) => {
                calls.push(args);
                return { status: 0, stdout };
            };
            const failingEntriesRead = (calls: string[][]) => (args: string[]) => {
                calls.push(args);
                const bad = args.at(-1)?.includes('FROM entries');
                return { status: 0, stdout: bad ? stdout : good };
            };

            it.each([
                { mode: [], exec: failingReads },
                { mode: ['--overwrite'], exec: failingReads },
                { mode: [], exec: failingEntriesRead },
                { mode: ['--overwrite'], exec: failingEntriesRead },
            ])('should exit 1 before any write (flags: $mode)', async ({ mode, exec }) => {
                const calls: string[][] = [];
                const io = capture();
                const argv = ['--remote', ...mode, '--out-dir', newOutDir()];
                expect(await run(argv, { ...io, exec: exec(calls) })).toBe(1);
                expect(calls.filter(isWrite)).toEqual([]);
                expect(io.text()).toContain('unexpected D1 response');
                expect(io.text()).not.toContain('entries: ');
            });
        });

        it('should mention --overwrite in the usage text', async () => {
            const io = capture();
            expect(await run(['--overwrite'], io)).toBe(2);
            expect(io.text()).toContain('[--overwrite]');
        });
    });

    it('should stop with exit 1 when wrangler fails', async () => {
        const exec = () => ({ status: 1, stdout: '' });
        expect(
            await run(['--local', '--out-dir', '/tmp/import-fail'], { ...capture(), exec }),
        ).toBe(1);
    });
});
