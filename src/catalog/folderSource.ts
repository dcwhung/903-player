/*
 * 「一個 folder = 一筆資料」嘅來源抽象：folder 名係 id，入面一個 JSON + 圖。
 * 而家只有 build time（import.meta.glob）實現；將來換 remote manifest 只需再寫一個 FolderSource，
 * registry / schema 全部唔使變。
 */
export interface Folder {
    /** folder 名 = id = route param */
    id: string;
    /** 錯誤 message 用嘅檔案路徑（例如 src/dramas/golden/drama.json） */
    source: string;
    /** JSON 原始內容，未驗證 */
    definition: unknown;
    /** folder 入面嘅圖：檔名 → 可以直接畀 <img src> 嘅 URL */
    images: Readonly<Record<string, string>>;
}

export interface FolderSource {
    folders(): readonly Folder[];
}

/** ./golden/drama.json → ['golden', 'drama.json'] */
const FOLDER_FILE_PATTERN = /^\.\/([^/]+)\/([^/]+)$/;

const splitKey = (key: string): [folder: string, file: string] => {
    const match = FOLDER_FILE_PATTERN.exec(key);
    if (!match?.[1] || !match[2]) throw new Error(`unexpected glob key ${key}`);
    return [match[1], match[2]];
};

const imagesOf = (
    images: Readonly<Record<string, string>>,
    folder: string,
): Record<string, string> =>
    Object.fromEntries(
        Object.entries(images)
            .map(([key, url]) => [splitKey(key), url] as const)
            .filter(([[dir]]) => dir === folder)
            .map(([[, file], url]) => [file, url]),
    );

/**
 * 將兩個 eager import.meta.glob 結果（`./<id>/<definitionFile>` 同 `./<id>/<image>`）砌成 FolderSource。
 * glob pattern 一定要係 literal，所以每個 domain 自己寫 glob，再交嚟呢度分組。
 */
export const foldersFromGlobs = (
    definitions: Readonly<Record<string, unknown>>,
    images: Readonly<Record<string, string>>,
    sourceDir: string,
): FolderSource => ({
    folders: () =>
        Object.entries(definitions).map(([key, definition]) => {
            const [id, file] = splitKey(key);
            return {
                id,
                source: `${sourceDir}/${id}/${file}`,
                definition,
                images: imagesOf(images, id),
            };
        }),
});
