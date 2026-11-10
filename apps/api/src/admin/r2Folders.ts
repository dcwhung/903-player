/* AUDIO bucket 頂層資料夾（每套劇一個）：delimited list，跟 cursor 讀晒 */

const DELIMITER = '/';

export const listTopFolders = async (bucket: R2Bucket): Promise<string[]> => {
    const folders: string[] = [];
    let cursor: string | undefined;
    do {
        const page = await bucket.list({ delimiter: DELIMITER, cursor });
        page.delimitedPrefixes.forEach((prefix) =>
            folders.push(prefix.slice(0, -DELIMITER.length)),
        );
        cursor = page.truncated ? page.cursor : undefined;
    } while (cursor !== undefined);
    return folders;
};
