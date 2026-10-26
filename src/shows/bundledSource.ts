/*
 * Build time 嘅節目來源：Vite import.meta.glob 掃 src/shows/<id>/，
 * show.json inline 入 bundle，圖經 Vite hash（PWA precache 照舊）。
 * 新開一個 folder 就會自動被發現，唔使改 code。glob pattern 一定要係 literal，所以寫喺呢度。
 */
import { foldersFromGlobs, type FolderSource } from '../catalog/folderSource';

const definitions = import.meta.glob<unknown>('./*/show.json', { eager: true, import: 'default' });
const images = import.meta.glob<string>('./*/*.{jpg,webp}', {
    eager: true,
    import: 'default',
    query: '?url',
});

export const bundledSource: FolderSource = foldersFromGlobs(definitions, images, 'src/shows');
