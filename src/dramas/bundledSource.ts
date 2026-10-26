/*
 * Build time 嘅 DramaSource：Vite import.meta.glob 掃 src/dramas/<id>/，
 * drama.json inline 入 bundle，webp 經 Vite hash（PWA precache 照舊）。
 * 新開一個 folder 就會自動被發現，唔使改 code。glob pattern 一定要係 literal，所以寫喺呢度。
 */
import { foldersFromGlobs } from '../catalog/folderSource';
import type { DramaSource } from './source';

const definitions = import.meta.glob<unknown>('./*/drama.json', { eager: true, import: 'default' });
const images = import.meta.glob<string>('./*/*.webp', {
    eager: true,
    import: 'default',
    query: '?url',
});

export const bundledSource: DramaSource = foldersFromGlobs(definitions, images, 'src/dramas');
