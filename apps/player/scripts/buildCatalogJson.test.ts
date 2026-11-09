// @vitest-environment node
// 生成結果同內建 registry 一致：src/catalog/catalogJson.test.ts；呢度測 CLI 同 scanLibrary（apps/api import 共用）
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseCatalogDocument } from '@903-player/catalog';
import { buildCatalogDocument, run, scanLibrary } from './buildCatalogJson.mjs';

const capture = () => {
    const chunks: string[] = [];
    return { out: (text: string) => chunks.push(text), text: () => chunks.join('') };
};

describe('buildCatalogJson CLI', () => {
    it('should print usage and exit 2 without --image-base', () => {
        const io = capture();
        expect(run([], io)).toBe(2);
        expect(io.text()).toMatch(/usage/);
    });

    it('should exit 2 on an unknown option', () => {
        expect(run(['--image-base', 'https://a.example/', '--nope'], capture())).toBe(2);
    });

    it('should print a valid catalog.json with the given base and time', () => {
        const io = capture();
        const code = run(
            ['--image-base', 'https://a.example/c', '--generated-at', '2026-11-07T00:00:00Z'],
            io,
        );

        const doc = parseCatalogDocument(JSON.parse(io.text()));
        expect(code).toBe(0);
        expect(doc.generatedAt).toBe('2026-11-07T00:00:00Z');
        expect(doc.dramas[0]?.images['tile.webp']).toMatch(/^https:\/\/a\.example\/c\/dramas\//);
    });

    it('should write to --out', () => {
        const dir = mkdtempSync(join(tmpdir(), 'catalog-'));
        try {
            const file = join(dir, 'catalog.json');
            expect(run(['--image-base', '/x/', '--out', file], capture())).toBe(0);
            expect(() =>
                parseCatalogDocument(JSON.parse(readFileSync(file, 'utf8'))),
            ).not.toThrow();
        } finally {
            rmSync(dir, { recursive: true, force: true });
        }
    });
});

describe('scanLibrary', () => {
    const library = scanLibrary();

    it('should list every show and drama folder with its definition', () => {
        expect(library.shows.length).toBeGreaterThan(0);
        expect(library.dramas.map((d) => d.id)).toContain('c18');
        expect(library.dramas.find((d) => d.id === 'c18')?.definition).toMatchObject({
            kind: 'daily',
        });
    });

    it('should give each image its relative name and an absolute path that exists', () => {
        const images = [...library.shows, ...library.dramas].flatMap((e) => e.images);
        expect(images.length).toBeGreaterThan(0);
        images.forEach(({ file, path }) => {
            expect(file).not.toContain('\\');
            expect(path.endsWith(join(...file.split('/')))).toBe(true);
            expect(existsSync(path)).toBe(true);
        });
    });

    it('should be what buildCatalogDocument turns into image URLs', () => {
        const doc = buildCatalogDocument({ imageBase: '/x/', generatedAt: 'now' });
        expect(doc.dramas.map((d) => [d.id, Object.keys(d.images)])).toEqual(
            library.dramas.map((d) => [d.id, d.images.map((i) => i.file)]),
        );
    });
});
