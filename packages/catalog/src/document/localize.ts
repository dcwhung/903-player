/*
 * Player prebuild snapshot（Backend Phase 2b-2）：build 時將 catalog.json 連圖下載入 bundle，
 * snapshot 入面嘅 images 值改寫做圖檔名（<hash>.<ext>）。Player 用 Vite 將圖 hash 入 dist 之後，
 * 再用呢度將檔名換返做 asset URL，先交 parseCatalogDocument / documentSource（同 runtime catalog 一樣行）
 */
import { CatalogDocumentError, type CatalogDocument, type CatalogEntry } from './document';

const localizeEntry =
    (urlByFile: Readonly<Record<string, string>>) =>
    (entry: CatalogEntry): CatalogEntry => ({
        ...entry,
        images: Object.fromEntries(
            Object.entries(entry.images).map(([file, name]) => {
                const url = urlByFile[name];
                if (url === undefined)
                    throw new CatalogDocumentError(
                        `snapshot: ${entry.id} image ${file} → ${name} was not bundled`,
                    );
                return [file, url];
            }),
        ),
    });

/** images 值（圖檔名）→ urlByFile 嘅 URL；有一張搵唔到就 throw（成份 snapshot 唔用） */
export const localizeDocument = (
    doc: CatalogDocument,
    urlByFile: Readonly<Record<string, string>>,
): CatalogDocument => ({
    ...doc,
    shows: doc.shows.map(localizeEntry(urlByFile)),
    dramas: doc.dramas.map(localizeEntry(urlByFile)),
});
