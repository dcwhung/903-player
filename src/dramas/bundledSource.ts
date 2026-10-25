/*
 * Build time 嘅 DramaSource：Vite import.meta.glob 掃 src/dramas/<id>/，
 * drama.json inline 入 bundle，webp 經 Vite hash（PWA precache 照舊）。
 * 新開一個 folder 就會自動被發現，唔使改 code。
 */
import type { DramaFolder, DramaSource } from './source';

const definitions = import.meta.glob<unknown>('./*/drama.json', { eager: true, import: 'default' });
const images = import.meta.glob<string>('./*/*.webp', {
    eager: true,
    import: 'default',
    query: '?url',
});

/** ./golden/drama.json → ['golden', 'drama.json'] */
const FOLDER_FILE_PATTERN = /^\.\/([^/]+)\/([^/]+)$/;
const SOURCE_DIR = 'src/dramas';

const splitKey = (key: string): [folder: string, file: string] => {
    const match = FOLDER_FILE_PATTERN.exec(key);
    if (!match?.[1] || !match[2]) throw new Error(`unexpected glob key ${key}`);
    return [match[1], match[2]];
};

const imagesOf = (folder: string): Record<string, string> =>
    Object.fromEntries(
        Object.entries(images)
            .map(([key, url]) => [splitKey(key), url] as const)
            .filter(([[dir]]) => dir === folder)
            .map(([[, file], url]) => [file, url]),
    );

const toFolder = ([key, definition]: [string, unknown]): DramaFolder => {
    const [id] = splitKey(key);
    return { id, source: `${SOURCE_DIR}/${id}/drama.json`, definition, images: imagesOf(id) };
};

export const bundledSource: DramaSource = {
    folders: () => Object.entries(definitions).map(toFolder),
};
