/*
 * scan test 共用：由「劇集 folder 底下嘅相對路徑」砌 FolderListing（同 CLI 由 fs 砌、Worker 由 R2 砌一樣嘅形狀）。
 * 第一層 folder = 短篇；短篇入面再深一層嘅 folder 用「名/」表示
 */
import type { FolderListing } from './types';
import { toChineseNumeral } from '../dramas/filename';

const SEPARATOR = '/';
const FILE_NO_WIDTH = 2;

const addArcFile = (arcs: Map<string, Set<string>>, arc: string, rest: readonly string[]) => {
    const files = arcs.get(arc) ?? new Set<string>();
    arcs.set(arc, files);
    if (rest.length === 0) return;
    files.add(rest.length === 1 ? (rest[0] ?? '') : `${rest[0] ?? ''}${SEPARATOR}`);
};

/** paths：相對劇集 folder，例如「甲/01 - 甲 - 第一集.m4a」、「cover photo.png」 */
export const listingOf = (name: string, paths: readonly string[]): FolderListing => {
    const rootFiles: string[] = [];
    const arcs = new Map<string, Set<string>>();
    paths.forEach((path) => {
        const [first = '', ...rest] = path.split(SEPARATOR);
        if (rest.length === 0) rootFiles.push(first);
        else addArcFile(arcs, first, rest);
    });
    return {
        name,
        rootFiles,
        arcs: [...arcs].map(([arc, files]) => ({ name: arc, files: [...files] })),
    };
};

/** 「NN - 短篇 - 第N集[ - 集名].m4a」，前面加短篇 folder */
export const episodeFile = (arc: string, no: number, title?: string, label = arc): string =>
    `${arc}/${String(no).padStart(FILE_NO_WIDTH, '0')} - ${label} - 第${toChineseNumeral(no)}集${title ? ` - ${title}` : ''}.m4a`;

export const range = (first: number, last: number): number[] =>
    Array.from({ length: last - first + 1 }, (_, i) => first + i);
