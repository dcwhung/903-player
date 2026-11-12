// @vitest-environment node
// compileSchema 用 node:fs 讀 schemas/：*.node.test.ts 行 tsconfig.node.json（有 Node 型別）
import { compileSchema } from '../../tests/jsonSchemas';
import { parseCatalogDocument } from './document';

/*
 * schemas/catalog.schema.json 同 runtime parser（document.ts）講同一套規則：同一批例子兩邊一齊收或者一齊拒；
 * 刻意唔同嘅位寫晒喺 DIVERGENCES（同 core/jsonSchemas.node.test.ts 一樣做法）
 */
type Json = Record<string, unknown>;

const schema = compileSchema('catalog');

const runtimeAccepts = (value: unknown): boolean => {
    try {
        parseCatalogDocument(value);
        return true;
    } catch {
        return false;
    }
};

const verdictOf = (value: Json) => ({ schema: schema(value), runtime: runtimeAccepts(value) });

const IMAGES = { 'tile.webp': 'https://cdn.example.com/a/tile.webp', 'disc.webp': '/c/disc.webp' };
const ENTRY: Json = { id: 'golden', definition: { name: 'x' }, images: IMAGES };
const BASE: Json = {
    schemaVersion: 1,
    generatedAt: '2026-11-07T10:00:00.123+08:00',
    shows: [ENTRY],
    dramas: [ENTRY],
};

/** BASE + 一個改動（path 用 . 分隔；value undefined = 刪走個 key） */
const withChange = (path: string, value: unknown): Json => {
    const result = structuredClone(BASE);
    const keys = path.split('.');
    const last = keys.pop() ?? '';
    const parent = keys.reduce<Json>((node, key) => node[key] as Json, result);
    if (value === undefined) delete parent[last];
    else parent[last] = value;
    return result;
};

const BANNER = { standard: 'https://cdn.example.com/banner.webp', long: '/c/banner-wide.webp' };

const withImage = (file: string, url: unknown) =>
    withChange('dramas.0.images', { ...IMAGES, [file]: url });

type Case = [label: string, value: Json];

const INVALID: Case[] = [
    ['冇 schemaVersion', withChange('schemaVersion', undefined)],
    ['schemaVersion 2', withChange('schemaVersion', 2)],
    ['schemaVersion 字串', withChange('schemaVersion', '1')],
    ['冇 generatedAt', withChange('generatedAt', undefined)],
    ['generatedAt 冇時區', withChange('generatedAt', '2026-11-07T10:00:00')],
    ['generatedAt 淨係日子', withChange('generatedAt', '2026-11-07')],
    ['generatedAt 用空格', withChange('generatedAt', '2026-11-07 10:00:00Z')],
    ['冇 shows', withChange('shows', undefined)],
    ['dramas 空 list', withChange('dramas', [])],
    ['dramas 係 object', withChange('dramas', { golden: ENTRY })],
    ['entry 係字串', withChange('shows.0', 'golden')],
    ['冇 id', withChange('dramas.0.id', undefined)],
    ['id 有大楷', withChange('dramas.0.id', 'Golden')],
    ['id 有底線', withChange('dramas.0.id', 'golden_boy')],
    ['冇 definition', withChange('dramas.0.definition', undefined)],
    ['definition 係 list', withChange('dramas.0.definition', [])],
    ['冇 images', withChange('dramas.0.images', undefined)],
    ['images 係 list', withChange('dramas.0.images', ['tile.webp'])],
    ['圖 URL 唔係字串', withImage('tile.webp', 1)],
    ['圖 URL http', withImage('tile.webp', 'http://cdn.example.com/tile.webp')],
    ['圖 URL protocol-relative', withImage('tile.webp', '//cdn.example.com/tile.webp')],
    ['圖 URL 相對', withImage('tile.webp', 'tile.webp')],
    ['圖 URL data:', withImage('tile.webp', 'data:image/webp;base64,AAAA')],
    ['圖 URL 空字串', withImage('tile.webp', '')],
    ['圖 URL https 冇 host', withImage('tile.webp', 'https://')],
    ['圖檔名 / 開頭', withImage('/tile.webp', '/a.webp')],
    ['圖檔名有 ..', withImage('arcs/../tile.webp', '/a.webp')],
    ['圖檔名有 .', withImage('./tile.webp', '/a.webp')],
    ['圖檔名有 backslash', withImage('arcs\\tile.webp', '/a.webp')],
    ['圖檔名空字串', withImage('', '/a.webp')],
    ['圖檔名 / 結尾', withImage('arcs/', '/a.webp')],
    ['banner 淨係窄版', withChange('banner', { standard: BANNER.standard })],
    ['banner 淨係闊版', withChange('banner', { long: BANNER.long })],
    ['banner 空 object', withChange('banner', {})],
    ['banner 係字串', withChange('banner', BANNER.standard)],
    ['banner 係 null', withChange('banner', null)],
    ['banner URL http', withChange('banner', { ...BANNER, long: 'http://x.example.com/b.webp' })],
    ['banner URL 相對', withChange('banner', { ...BANNER, standard: 'banner.webp' })],
    ['banner 多出 key', withChange('banner', { ...BANNER, wide: BANNER.long })],
];

const VALID: Case[] = [
    ['基本例子', BASE],
    ['generatedAt 用 Z', withChange('generatedAt', '2026-11-07T10:00:00Z')],
    ['頂層多出嚟嘅 key', withChange('notice', { text: 'x' })],
    ['有 banner（窄 + 闊）', withChange('banner', BANNER)],
    ['加 $schema', withChange('$schema', '../schemas/catalog.schema.json')],
    ['圖檔名喺 sub-folder', withImage('arcs/season-1/disc.webp', '/a.webp')],
    ['圖檔名有中文同空格', withImage('封面 1.webp', '/a.webp')],
    ['圖 URL 有 query', withImage('tile.webp', 'https://cdn.example.com/t.webp?v=2')],
    ['圖 URL 有 port', withImage('tile.webp', 'https://cdn.example.com:8443/t.webp')],
    ['images 空 object', withChange('dramas.0.images', {})],
    ['shows 同 dramas 用同一個 id', BASE],
];

describe('catalog.schema.json vs parseCatalogDocument', () => {
    it.each(INVALID)('should reject %s in both', (_label, value) => {
        expect(verdictOf(value)).toEqual({ schema: false, runtime: false });
    });

    it.each(VALID)('should accept %s in both', (_label, value) => {
        expect(verdictOf(value), JSON.stringify(schema.errors)).toEqual({
            schema: true,
            runtime: true,
        });
    });

    describe('DIVERGENCES（已知、刻意）', () => {
        it('schema only: should reject an extra key in an entry (typo shows in the editor)', () => {
            expect(verdictOf(withChange('dramas.0.banner', 'x'))).toEqual({
                schema: false,
                runtime: true,
            });
        });

        it.each<Case>([
            ['同一類 id 重複', withChange('dramas', [ENTRY, ENTRY])],
            ['generatedAt 唔存在嘅日子', withChange('generatedAt', '2026-02-30T10:00:00Z')],
        ])('runtime only: should reject %s', (_label, value) => {
            expect(verdictOf(value)).toEqual({ schema: true, runtime: false });
        });
    });
});
