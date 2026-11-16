/*
 * 待辦行 ↔ 選擇發佈（api 0.10.0）：每行嘅 key（POST /api/publish selection.content 用）同可唔可以揀。
 * key 由 kind + 劇 ID（+ 短篇 ID）砌，同 GET /api/todos 合併行用同一個 key
 */
import type { FindingKind } from './findings';

/**
 * selectable：設定好晒，可以揀今次發佈；incomplete：有「必須處理」（或者劇仲係 draft），今次一定唔發佈；
 * always：唔可以剔走（已發佈劇集嘅新集數、資料夾唔見），跟其他已儲存改動一齊發佈
 */
export type PublishMode = 'selectable' | 'incomplete' | 'always';

/** 可以逐項揀嘅新內容：新劇（成個 entry）、新短篇（劇 definition 入面嗰個 arc） */
const PICKABLE_KINDS: ReadonlySet<FindingKind> = new Set(['newDrama', 'newArc']);

export const todoKey = (kind: FindingKind, dramaId: string, arcId: string | null): string =>
    [kind, dramaId, ...(arcId === null ? [] : [arcId])].join('/');

export const publishModeOf = (
    kind: FindingKind,
    { blocking, draft }: { blocking: boolean; draft: boolean },
): PublishMode => {
    if (!PICKABLE_KINDS.has(kind)) return 'always';
    return blocking || draft ? 'incomplete' : 'selectable';
};
