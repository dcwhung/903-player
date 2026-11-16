/*
 * Prebuild snapshot（Backend Phase 2b-2）：production build 時 scripts/catalogSnapshot.ts 將最新 publish 嘅
 * catalog.json 連圖下載去 ./data/（gitignored），呢度用 import.meta.glob 包入 bundle：圖經 Vite hash 入
 * dist/assets/，PWA precache 照舊。冇 snapshot（CI、本機未 build、fetch 失敗）glob 回 {} → 用 repo library。
 * glob pattern 一定要係 literal，所以寫喺呢度。
 */
import {
    CatalogDocumentError,
    documentSource,
    localizeDocument,
    parseCatalogDocument,
    type CatalogDocument,
    type CatalogKind,
    type FolderSource,
} from '@903-player/catalog';

const documents = import.meta.glob<unknown>('./data/catalog.json', {
    eager: true,
    import: 'default',
});
// no-inline：細圖都要係 URL（data: URI 過唔到 catalog 圖 URL 驗證）
const images = import.meta.glob<string>('./data/img/*.{webp,jpg}', {
    eager: true,
    import: 'default',
    query: '?no-inline',
});

/** unit test 測 library（本機 build 過留低嘅 snapshot 唔好影響）；e2e 用 library + 測試劇 */
const LIBRARY_ONLY_MODES: readonly string[] = ['test', 'e2e'];

const fileNameOf = (path: string) => path.slice(path.lastIndexOf('/') + 1);

const bundledUrl = (urlByFile: Readonly<Record<string, string>>, name: string, slot: string) => {
    const url = urlByFile[name];
    if (url === undefined)
        throw new CatalogDocumentError(`snapshot: banner.${slot} → ${name} was not bundled`);
    return url;
};

/**
 * banner 值（圖檔名，Phase 4）→ bundle URL：localizeDocument 只換 shows / dramas 嘅 images，
 * banner 喺 player 呢度換；搵唔到就 throw（同 entry 圖一樣，成份 snapshot 唔用）
 */
const localizeBanner = (
    doc: CatalogDocument,
    urlByFile: Readonly<Record<string, string>>,
): CatalogDocument =>
    doc.banner
        ? {
              ...doc,
              banner: {
                  standard: bundledUrl(urlByFile, doc.banner.standard, 'standard'),
                  long: bundledUrl(urlByFile, doc.banner.long, 'long'),
              },
          }
        : doc;

/** glob 結果 → 驗過嘅 snapshot（圖指去 bundle URL）；冇 snapshot → undefined；壞咗 → warn + undefined */
export const loadSnapshot = (
    globbedDocuments: Readonly<Record<string, unknown>>,
    globbedImages: Readonly<Record<string, string>>,
): CatalogDocument | undefined => {
    const raw = Object.values(globbedDocuments)[0];
    if (raw === undefined) return undefined;
    const urlByFile = Object.fromEntries(
        Object.entries(globbedImages).map(([path, url]) => [fileNameOf(path), url]),
    );
    try {
        const localized = localizeDocument(raw as CatalogDocument, urlByFile);
        return parseCatalogDocument(localizeBanner(localized, urlByFile));
    } catch (error) {
        console.warn('[catalog] bundled snapshot unusable, using the repo library', error);
        return undefined;
    }
};

export const snapshotDocument: CatalogDocument | undefined = LIBRARY_ONLY_MODES.includes(
    import.meta.env.MODE,
)
    ? undefined
    : loadSnapshot(documents, images);

/** 有 snapshot 就用 snapshot 嗰類，冇就用 repo library */
export const preferSnapshot = (
    snapshot: CatalogDocument | undefined,
    kind: CatalogKind,
    library: FolderSource,
): FolderSource => (snapshot ? documentSource(snapshot, kind) : library);
