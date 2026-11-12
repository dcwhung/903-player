/* D1 definition（未驗證 JSON）嘅安全讀法：drama / show / arc 欄位 */
import type { ImageMap, RawDefinition } from '../api/types';
import { imageUrl } from '../api/endpoints';

const DEFAULT_FIRST_NO = 1;

export const isRecord = (value: unknown): value is RawDefinition =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

export const str = (raw: RawDefinition, key: string): string | undefined =>
    typeof raw[key] === 'string' ? raw[key] : undefined;

export const strList = (raw: RawDefinition, key: string): string[] =>
    Array.isArray(raw[key]) ? raw[key].filter((v): v is string => typeof v === 'string') : [];

export const arcsOf = (definition: RawDefinition): RawDefinition[] =>
    Array.isArray(definition.arcs) ? definition.arcs.filter(isRecord) : [];

export const firstNoOf = (raw: RawDefinition): number =>
    typeof raw.firstNo === 'number' ? raw.firstNo : DEFAULT_FIRST_NO;

/** episodes = 集數，或者每集標題 list */
export const countOf = (raw: RawDefinition): number => {
    const { episodes } = raw;
    if (typeof episodes === 'number') return episodes;
    return Array.isArray(episodes) ? episodes.length : 0;
};

export const isDaily = (definition: RawDefinition): boolean => definition.kind === 'daily';

export const totalEpisodes = (definition: RawDefinition): number =>
    isDaily(definition)
        ? countOf(definition)
        : arcsOf(definition).reduce((sum, arc) => sum + countOf(arc), 0);

/** 短篇顯示名（displayName ?? name，同 catalog arcLabelOf） */
export const arcLabel = (arc: RawDefinition): string =>
    str(arc, 'displayName') ?? str(arc, 'name') ?? str(arc, 'id') ?? '';

/** 短篇有冇上過架（GET /api/entries publishedArcs）；舊 API 冇呢個欄位 = undefined（唔知） */
export const arcPublishedIn = (
    publishedArcs: readonly string[] | undefined,
    arcId: string,
): boolean | undefined => (publishedArcs === undefined ? undefined : publishedArcs.includes(arcId));

export const nameOf = (definition: RawDefinition, fallback: string): string =>
    str(definition, 'name') ?? fallback;

/** definition 指住嘅圖（disc / tile 檔名）→ URL；未上載就 undefined */
export const imageOf = (
    raw: RawDefinition,
    images: ImageMap,
    slot: 'disc' | 'tile',
): string | undefined => {
    const file = str(raw, slot);
    const name = file === undefined ? undefined : images[file];
    return name === undefined ? undefined : imageUrl(name);
};
