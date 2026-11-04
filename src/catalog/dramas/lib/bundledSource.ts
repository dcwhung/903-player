/*
 * Build time 嘅 DramaSource：Vite import.meta.glob 掃 src/catalog/dramas/library/<id>/，
 * drama.json inline 入 bundle，webp 經 Vite hash（PWA precache 照舊）。
 * 新開一個 folder 就會自動被發現，唔使改 code。glob pattern 一定要係 literal，所以寫喺呢度。
 */
import { foldersFromGlobs } from '../../core/folderSource';
import type { DramaSource } from './source';

const definitions = import.meta.glob<unknown>('../library/*/drama.json', {
    eager: true,
    import: 'default',
});
const images = import.meta.glob<string>('../library/*/**/*.webp', {
    eager: true,
    import: 'default',
    query: '?url',
});

export const bundledSource: DramaSource = foldersFromGlobs(
    definitions,
    images,
    'src/catalog/dramas/library',
);
