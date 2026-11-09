#!/usr/bin/env node
/*
 * buildCatalogJson.mjs：由 app 內建資料（src/catalog/{shows,dramas}/library/）生成 runtime 用嘅 catalog.json（v1）。
 *
 *   node scripts/buildCatalogJson.mjs --image-base <URL> [--out <檔案>] [--generated-at <ISO 時間>]
 *
 * 圖 URL = <image-base><shows|dramas>/<id>/<檔名>（逐段 encode）；圖檔要另外照呢個 layout 上載。
 * Phase 1：e2e fixture（e2e/remoteCatalog.mjs）；Phase 2a：scanLibrary 畀 apps/api/scripts/importLibrary.mjs 匯入 D1 / R2。
 * 掃圖規則同 bundledSource.ts 嘅 import.meta.glob 一樣（劇集：folder 入面任何深度嘅 .webp；節目：folder 頂層 .jpg / .webp），
 * src/catalog/catalogJson.test.ts 驗生成結果 build 出嚟嘅 registry 同內建一模一樣。只用 Node 內置 module。
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

export const CATALOG_SCHEMA_VERSION = 1;

/** 每類：definition 檔名、邊啲圖入 manifest、可唔可以喺 sub-folder（同 bundledSource.ts 嘅 glob 一致） */
const KINDS = [
    { kind: 'shows', definition: 'show.json', image: /\.(jpg|webp)$/, nested: false },
    { kind: 'dramas', definition: 'drama.json', image: /\.webp$/, nested: true },
];

/** 預設 src/catalog/（lazy：test 環境嘅 import.meta.url 未必係 file:） */
const defaultCatalogDir = () => fileURLToPath(new URL('../src/catalog/', import.meta.url));

const USAGE =
    'usage: node scripts/buildCatalogJson.mjs --image-base <URL> [--out <file>] [--generated-at <ISO>]';

const subFolders = (dir) =>
    readdirSync(dir, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .sort();

/** folder 入面嘅圖（相對路徑，用 / 分隔，排好序） */
const imageFiles = (folder, { image, nested }) =>
    readdirSync(folder, { withFileTypes: true, recursive: nested })
        .filter((entry) => entry.isFile() && image.test(entry.name))
        .map((entry) => relative(folder, join(entry.parentPath, entry.name)).split(sep).join('/'))
        .sort();

const imageUrl = (imageBase, kind, id, file) =>
    `${imageBase}${[kind, id, ...file.split('/')].map(encodeURIComponent).join('/')}`;

/** 一個 folder：definition（parse 咗嘅 JSON）+ 圖（相對檔名 + 絕對路徑） */
const scanFolder = (libraryDir, spec) => (id) => {
    const folder = join(libraryDir, id);
    const definition = JSON.parse(readFileSync(join(folder, spec.definition), 'utf8'));
    const images = imageFiles(folder, spec).map((file) => ({
        file,
        path: join(folder, ...file.split('/')),
    }));
    return { id, definition, images };
};

/**
 * 掃 src/catalog/{shows,dramas}/library/：每個 folder 嘅 definition + 圖。catalog.json（下面）同
 * apps/api/scripts/importLibrary.mjs（Backend Phase 2a 匯入 D1 / R2）共用，規則唔好喺第二度重寫
 */
export function scanLibrary({ catalogDir = defaultCatalogDir() } = {}) {
    const listOf = (spec) => {
        const libraryDir = join(catalogDir, spec.kind, 'library');
        return subFolders(libraryDir).map(scanFolder(libraryDir, spec));
    };
    const [shows, dramas] = KINDS.map(listOf);
    return { shows, dramas };
}

/** image base 一定要以 / 結尾，先可以直接接 <kind>/<id>/<檔名> */
const withTrailingSlash = (base) => (base.endsWith('/') ? base : `${base}/`);

const toCatalogEntry =
    (kind, base) =>
    ({ id, definition, images }) => ({
        id,
        definition,
        images: Object.fromEntries(
            images.map(({ file }) => [file, imageUrl(base, kind, id, file)]),
        ),
    });

/**
 * 生成 catalog.json 內容（未序列化）。catalogDir 預設 src/catalog/；
 * generatedAt 預設而家（test 傳固定值）
 */
export function buildCatalogDocument({
    imageBase,
    catalogDir = defaultCatalogDir(),
    generatedAt = new Date().toISOString(),
}) {
    if (!imageBase) throw new Error('imageBase is required');
    const base = withTrailingSlash(imageBase);
    const library = scanLibrary({ catalogDir });
    return {
        schemaVersion: CATALOG_SCHEMA_VERSION,
        generatedAt,
        shows: library.shows.map(toCatalogEntry('shows', base)),
        dramas: library.dramas.map(toCatalogEntry('dramas', base)),
    };
}

/** CLI：成功 0；參數錯 2 */
export function run(argv, { out = (text) => process.stdout.write(text) } = {}) {
    let values;
    try {
        ({ values } = parseArgs({
            args: argv,
            options: {
                'image-base': { type: 'string' },
                out: { type: 'string' },
                'generated-at': { type: 'string' },
            },
        }));
    } catch (error) {
        out(`${error.message}\n${USAGE}\n`);
        return 2;
    }
    if (!values['image-base']) {
        out(`${USAGE}\n`);
        return 2;
    }
    const doc = buildCatalogDocument({
        imageBase: values['image-base'],
        generatedAt: values['generated-at'],
    });
    const json = `${JSON.stringify(doc, null, 4)}\n`;
    if (values.out) writeFileSync(values.out, json);
    else out(json);
    return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    process.exitCode = run(process.argv.slice(2));
}
