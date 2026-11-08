// @vitest-environment node
// 生成結果同內建 registry 一致：src/catalog/catalogJson.test.ts；呢度淨係測 CLI
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseCatalogDocument } from '@903-player/catalog';
import { run } from './buildCatalogJson.mjs';

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
