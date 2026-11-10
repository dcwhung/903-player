/*
 * R2（AUDIO bucket）→ FolderListing：list({ prefix, delimiter: '/' }) 兩層（劇集 folder + 每個短篇 folder），
 * 跟 cursor 讀晒全部頁。key 名就係原始檔名（R2 唔會 normalise）
 */
import type { FolderListing } from '@903-player/catalog';

const DELIMITER = '/';

interface Level {
    files: string[];
    folders: string[];
}

/** 一層：檔名 + sub-folder 名（都去咗 prefix）；folder marker object（key = prefix）略過 */
const listLevel = async (bucket: R2Bucket, prefix: string): Promise<Level> => {
    const level: Level = { files: [], folders: [] };
    let cursor: string | undefined;
    do {
        const page = await bucket.list({ prefix, delimiter: DELIMITER, cursor });
        page.objects.forEach(({ key }) => {
            if (key !== prefix) level.files.push(key.slice(prefix.length));
        });
        page.delimitedPrefixes.forEach((p) =>
            level.folders.push(p.slice(prefix.length, -DELIMITER.length)),
        );
        cursor = page.truncated ? page.cursor : undefined;
    } while (cursor !== undefined);
    return level;
};

const arcListing = async (bucket: R2Bucket, prefix: string, name: string) => {
    const { files, folders } = await listLevel(bucket, `${prefix}${name}${DELIMITER}`);
    return { name, files: [...files, ...folders.map((f) => `${f}${DELIMITER}`)] };
};

/** <folder>/ 底下兩層 → FolderListing（同 CLI 由 fs 砌嘅一樣） */
export const listingFromR2 = async (bucket: R2Bucket, folder: string): Promise<FolderListing> => {
    const prefix = `${folder}${DELIMITER}`;
    const root = await listLevel(bucket, prefix);
    const arcs = await Promise.all(root.folders.map((name) => arcListing(bucket, prefix, name)));
    return { name: folder, rootFiles: root.files, arcs };
};
