/* 廣播劇編輯：短篇（arc）讀寫、排序、各集標題寫返 definition */
import type { RawDefinition } from '../../api/types';
import { arcsOf, countOf, isRecord, str } from '../../model/raw';

/** 掃描派嘅 placeholder ID（drama-01、arc-01）：未發佈，要人手改 */
export const PLACEHOLDER_ID = /^(drama|arc)-\d+$/;

export const arcIdOf = (arc: RawDefinition, index: number): string => str(arc, 'id') ?? `#${index}`;

export const updateArc = (
    definition: RawDefinition,
    arcId: string,
    update: (arc: RawDefinition) => RawDefinition,
): RawDefinition => ({
    ...definition,
    arcs: arcsOf(definition).map((arc, i) => (arcIdOf(arc, i) === arcId ? update(arc) : arc)),
});

/** 拖 ⠿ 改短篇次序（ids = 新次序） */
export const reorderArcs = (definition: RawDefinition, ids: readonly string[]): RawDefinition => {
    const arcs = arcsOf(definition);
    const byId = new Map(arcs.map((arc, i) => [arcIdOf(arc, i), arc]));
    return { ...definition, arcs: ids.flatMap((id) => byId.get(id) ?? []) };
};

/**
 * 各集標題 → arc：episodes 係集名 list 就逐格改（冇標題 = null），否則寫 titles（空就刪）
 */
export const withTitles = (arc: RawDefinition, titles: Record<string, string>): RawDefinition => {
    const firstNo = typeof arc.firstNo === 'number' ? arc.firstNo : 1;
    if (Array.isArray(arc.episodes)) {
        const episodes = Array.from(
            { length: countOf(arc) },
            (_, i) => titles[firstNo + i] ?? null,
        );
        const { titles: _old, ...rest } = arc;
        void _old;
        return { ...rest, episodes };
    }
    const rest = Object.fromEntries(Object.entries(arc).filter(([key]) => key !== 'titles'));
    return Object.keys(titles).length > 0 ? { ...rest, titles } : rest;
};

export const r2FolderOf = (definition: RawDefinition): string | undefined =>
    isRecord(definition.audio) ? str(definition.audio, 'folder') : undefined;

export const r2TemplateOf = (definition: RawDefinition): string | undefined =>
    isRecord(definition.audio) ? str(definition.audio, 'file') : undefined;
