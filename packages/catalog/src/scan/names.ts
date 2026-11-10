/*
 * 檔名 / folder 名工具：集數中文數字、「NN - 短篇 - 第N集[ - 集名]」parse、可疑字元檢查、R2 listing 次序。
 * 同 dramas/filename.ts 嘅 template 規則一致
 */
import { toChineseNumeral } from '../dramas/filename';

const MAX_CHINESE_NUMERAL = 99;
const HEX_WIDTH = 4;
const HEX_RADIX = 16;
/** 「NN - 短篇 - 第N集[ - 集名]」（短篇名本身可以有「 - 」，所以用 lazy） */
const EPISODE_PATTERN = /^(\d+) - (.+?) - 第([^集]+)集(?: - (.+))?$/s;

const NUMERAL_LOOKUP = new Map(
    Array.from({ length: MAX_CHINESE_NUMERAL + 1 }, (_, n) => [toChineseNumeral(n), n]),
);

/** 「第X集」入面嘅 X → 數字（中文數字或者阿拉伯數字）；讀唔到就 undefined */
export const parseEpisodeNumeral = (text: string): number | undefined =>
    /^\d+$/.test(text) ? Number(text) : NUMERAL_LOOKUP.get(text);

/** 副檔名（細楷，連「.」）；冇 / 隱藏檔就 '' */
export const extensionOf = (name: string): string => {
    const dot = name.lastIndexOf('.');
    return dot <= 0 ? '' : name.slice(dot).toLowerCase();
};

export interface ParsedEpisodeFile {
    file: string;
    no: number;
    zhNo: number | undefined;
    label: string;
    title: string;
    ext: string;
}

/** 「NN - 短篇 - 第N集[ - 集名].m4a」→ 各部分（NFC）；唔符合就 null */
export const parseEpisodeFileName = (rawFile: string): ParsedEpisodeFile | null => {
    const file = rawFile.normalize('NFC');
    const ext = extensionOf(file);
    const match = EPISODE_PATTERN.exec(file.slice(0, file.length - ext.length));
    if (!match) return null;
    const [, digits = '', label = '', numeral = '', title] = match;
    return {
        file,
        no: Number(digits),
        zhNo: parseEpisodeNumeral(numeral),
        label,
        title: title ?? '',
        ext,
    };
};

const uPlus = (ch: string): string =>
    `U+${(ch.codePointAt(0) ?? 0).toString(HEX_RADIX).toUpperCase().padStart(HEX_WIDTH, '0')}`;

/**
 * 全形英數（０–９、Ａ–Ｚ、ａ–ｚ）：同半形睇落一樣但 byte 唔同，先係陷阱。
 * 中文全形標點（？！，：（））係正常寫法，R2 key 就係咁，唔報；亦唔可以叫用戶改半形：
 * Windows 檔名唔准「?」，改名要重新上載，網址一變 app 就播唔到（進度 key 係 episode ID，唔受影響）。
 */
const FULL_WIDTH_ALPHANUMERIC = /[\uff10-\uff19\uff21-\uff3a\uff41-\uff5a]/u;

/** [regex, 描述]：全部係「睇落一樣但係 byte 唔同」嘅陷阱 */
const CHARACTER_TRAPS: readonly [RegExp, (ch: string) => string][] = [
    [
        /[\u2160-\u2188]/u,
        (ch) => `羅馬數字「${ch}」(${uPlus(ch)})，ASCII 寫法係「${ch.normalize('NFKC')}」`,
    ],
    [
        FULL_WIDTH_ALPHANUMERIC,
        (ch) =>
            `全形英數「${ch}」(${uPlus(ch)})，同半形「${ch.normalize('NFKC')}」睇落一樣但 byte 唔同；確認 R2 上面都係全形`,
    ],
    [/\u3000/u, (ch) => `有全形空格 (${uPlus(ch)})`],
    [/[\u200b-\u200d\u2060\ufeff]/u, (ch) => `有隱形字元 (${uPlus(ch)})`],
];

/** 一個名有咩可疑之處（冇就空 array） */
export const findSuspicious = (name: string): string[] => {
    const found = CHARACTER_TRAPS.flatMap(([pattern, describe]) => {
        const match = pattern.exec(name);
        return match ? [describe(match[0])] : [];
    });
    if (name !== name.normalize('NFC'))
        found.push(
            'Unicode 係 NFD 分解形式（macOS 常見）；drama.json 會用 NFC，上載後請用 --verify 確認',
        );
    if (/^\s|\s$/u.test(name)) found.push('頭尾有空格');
    if (/ {2,}/.test(name)) found.push('有連續空格');
    return found;
};

/**
 * R2 listing 係 UTF-8 byte 次序（同 Node Buffer.compare 一樣）。UTF-8 嘅 byte 次序 = Unicode code point 次序，
 * 所以逐個 code point 比就得（唔可以用 < 比 UTF-16 code unit：U+FF5E 會排喺 emoji 之後）；Worker 冇 Buffer
 */
export const byteOrder = (a: string, b: string): number => {
    const [x, y] = [[...a], [...b]];
    const length = Math.min(x.length, y.length);
    for (let i = 0; i < length; i += 1) {
        const diff = (x[i]?.codePointAt(0) ?? 0) - (y[i]?.codePointAt(0) ?? 0);
        if (diff !== 0) return diff;
    }
    return x.length - y.length;
};
