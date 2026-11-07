// @vitest-environment node
// 要用 node:fs 讀資料 folder：*.node.test.ts 行 tsconfig.node.json（有 Node 型別）
import { readdirSync, readFileSync } from 'node:fs';
import { compileSchema } from '@903-player/catalog/testing/json-schemas';

/*
 * 現有資料檔（library/<id>/drama.json、show.json）全部要過 @903-player/catalog 嘅 JSON Schema。
 * schema 同 runtime validator 講唔講同一套規則，喺 packages/catalog/src/core/jsonSchemas.node.test.ts 驗
 */
const CATALOG = new URL('./', import.meta.url);

type Json = Record<string, unknown>;

const readJson = (url: URL): Json => JSON.parse(readFileSync(url, 'utf8')) as Json;

const dramaSchema = compileSchema('drama');
const showSchema = compileSchema('show');

describe('catalog JSON schemas', () => {
    describe('現有資料檔全部合格', () => {
        const folders = (kind: string) =>
            readdirSync(new URL(`${kind}/library/`, CATALOG), { withFileTypes: true })
                .filter((entry) => entry.isDirectory())
                .map((entry) => entry.name);

        it.each(folders('dramas'))(
            'should accept src/catalog/dramas/library/%s/drama.json',
            (id) => {
                const data = readJson(new URL(`dramas/library/${id}/drama.json`, CATALOG));
                expect(dramaSchema(data), JSON.stringify(dramaSchema.errors)).toBe(true);
            },
        );

        it.each(folders('shows'))('should accept src/catalog/shows/library/%s/show.json', (id) => {
            const data = readJson(new URL(`shows/library/${id}/show.json`, CATALOG));
            expect(showSchema(data), JSON.stringify(showSchema.errors)).toBe(true);
        });
    });
});
