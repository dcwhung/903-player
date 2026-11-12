/*
 * FolderListing → DramaScan：每層分類做錄音 / 封面 / 略過（按 R2 嘅 UTF-8 byte 次序），
 * 第一層 sub-folder = 短篇（隱藏 / 系統 folder 當略過）
 */
import { byteOrder, extensionOf } from './names';
import type { ArcScan, DramaScan, FolderListing } from './types';

/** ArcScan 入面由固定檔名配對嘅封面 */
type CoverRole = 'cdCover' | 'coverPhoto';
type CoverRoles = Partial<Record<CoverRole, string>>;

const AUDIO_EXTENSIONS = new Set(['.m4a', '.mp3', '.aac', '.mp4']);
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);
/** 系統自動生成嘅檔（macOS / Windows），一律略過 */
const SYSTEM_FILES = new Set(['thumbs.db', 'desktop.ini']);
const FOLDER_SUFFIX = '/';
/** 固定封面檔名（唔計副檔名、細楷）→ 角色；其他圖照列 covers 但唔自動配對 */
const COVER_ROLES: ReadonlyMap<string, CoverRole> = new Map([
    ['cd cover', 'cdCover'],
    ['cover photo', 'coverPhoto'],
]);

type Group = 'dirs' | 'audio' | 'images' | 'ignored';
type Groups = Record<Group, string[]>;

interface Entry {
    name: string;
    isDirectory: boolean;
}

const classify = ({ name, isDirectory }: Entry): Group => {
    const lower = name.toLowerCase();
    if (name.startsWith('.') || SYSTEM_FILES.has(lower)) return 'ignored';
    if (isDirectory) return 'dirs';
    if (AUDIO_EXTENSIONS.has(extensionOf(lower))) return 'audio';
    return IMAGE_EXTENSIONS.has(extensionOf(lower)) ? 'images' : 'ignored';
};

/** 一層分類（原始名，未 normalise），每類按 byte 次序 */
const groupEntries = (entries: readonly Entry[]): Groups => {
    const groups: Groups = { dirs: [], audio: [], images: [], ignored: [] };
    entries.forEach((entry) => groups[classify(entry)].push(entry.name));
    Object.values(groups).forEach((names) => names.sort(byteOrder));
    return groups;
};

/** images 已按 byte 次序：同一角色有幾個副檔名就揀第一個 */
const coverRolesOf = (images: readonly string[]): CoverRoles => {
    const roles: CoverRoles = {};
    images.forEach((image) => {
        const lower = image.toLowerCase();
        const role = COVER_ROLES.get(lower.slice(0, -extensionOf(lower).length));
        if (role !== undefined && roles[role] === undefined) roles[role] = image;
    });
    return roles;
};

/** 「名/」= folder */
const entryOf = (file: string): Entry =>
    file.endsWith(FOLDER_SUFFIX)
        ? { name: file.slice(0, -FOLDER_SUFFIX.length), isDirectory: true }
        : { name: file, isDirectory: false };

const scanArc = (rawName: string, files: readonly string[]): ArcScan => {
    const { dirs, audio, images, ignored } = groupEntries(files.map(entryOf));
    return {
        rawName,
        name: rawName.normalize('NFC'),
        audio,
        covers: images,
        ...coverRolesOf(images),
        ignored: [...ignored, ...dirs.map((d) => `${d}${FOLDER_SUFFIX}`)].sort(byteOrder),
    };
};

/** 讀成個劇集 folder：劇集層封面 / 錄音 / 略過檔，同每個短篇 folder */
export const scanListing = (listing: FolderListing): DramaScan => {
    const filesOf = new Map(listing.arcs.map((arc) => [arc.name, arc.files]));
    const entries = [
        ...listing.rootFiles.map(entryOf),
        ...listing.arcs.map((arc) => ({ name: arc.name, isDirectory: true })),
    ];
    const { dirs, audio, images, ignored } = groupEntries(entries);
    const arcs = dirs.map((d) => scanArc(d, filesOf.get(d) ?? []));
    arcs.sort((a, b) => byteOrder(a.name, b.name));
    const rawName = listing.name;
    return {
        rawName,
        name: rawName.normalize('NFC'),
        audio,
        covers: images,
        ...coverRolesOf(images),
        ignored,
        arcs,
    };
};
