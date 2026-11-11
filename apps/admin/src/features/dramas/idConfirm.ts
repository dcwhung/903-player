/*
 * 掃描自動派嘅 ID（新劇 drama-NN、新短篇 <劇 ID>-NN）要 admin 確認（3c）：
 * 待辦 ID 格仲係「必須」= 未確認；儲存時（就算冇改）POST /api/todos/confirm-id
 */
import { confirmId } from '../../api/endpoints';
import type { TodoRow } from '../../api/types';
import { useAdminData } from '../../data/AdminData';

const idMust = (row: TodoRow) => row.cells.id.state === 'must';

/** 掃描自動派嘅 ID 未確認（待辦 ID 格仲係「必須」）：新劇 drama-NN、新短篇 <劇 ID>-NN */
export const useUnconfirmedIds = (id: string) => {
    const rows = useAdminData().todos.data?.rows ?? [];
    const mine = rows.filter((row) => row.dramaId === id && idMust(row));
    return {
        dramaIdUnconfirmed: mine.some((row) => row.kind === 'newDrama'),
        isArcIdUnconfirmed: (arcId: string) =>
            mine.some((row) => row.kind === 'newArc' && row.arcId === arcId),
    };
};

/** 儲存時一齊確認嘅 ID：drama = 劇 ID；arcIds = 打開咗（睇到 ID 欄）嘅短篇 */
export interface IdConfirm {
    drama?: boolean;
    arcIds?: readonly string[];
}

export const confirmAll = async (dramaId: string, { drama = false, arcIds = [] }: IdConfirm) => {
    if (drama) await confirmId(dramaId);
    for (const arcId of arcIds) await confirmId(dramaId, arcId);
};
