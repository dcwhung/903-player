/*
 * 確認發佈時間線最尾「不會在本次發佈」：Design Origin: mockup: _mockups_/admin-publish-summary/index.html
 * 來源 = 待辦嘅未完成行 + server 自動剔走嘅（揀咗之後先變未完成）；按劇分卡（第一次出現嘅次序）
 */
import type { ChangesResponse, TodoRow } from '../../api/types';
import { missingText, splitName } from './todoModel';

export interface SkipRow {
    key: string;
    dramaId: string;
    arcId: string | null;
    /** 短篇名；劇本身（新劇 / 資料夾）= 空 */
    arcName: string;
    reason: string;
}

export interface SkipCard {
    dramaId: string;
    name: string;
    rows: SkipRow[];
}

export const skippedRows = (
    rows: readonly TodoRow[],
    data: ChangesResponse | undefined,
): TodoRow[] => {
    const skipped = new Set(data?.selection?.skipped.map((s) => s.key));
    return rows.filter((row) => row.publish === 'incomplete' || skipped.has(row.key));
};

/** 原因：「尚未設定排期」；冇缺嘅格 = 空（tag 已寫「未完成」） */
export const skipReason = (row: TodoRow): string => missingText(row);

const skipRowOf = (row: TodoRow): SkipRow => ({
    key: row.key,
    dramaId: row.dramaId,
    arcId: row.arcId,
    arcName: row.arcId === null ? '' : splitName(row).title,
    reason: skipReason(row),
});

/** 劇名：短篇行 = 「劇名 · 短篇名」嘅前半；劇本身 = 成個名 */
const dramaNameOf = (row: TodoRow): string => splitName(row).drama || row.name;

export const skipCardsOf = (rows: readonly TodoRow[]): SkipCard[] => {
    const cards = new Map<string, SkipCard>();
    rows.forEach((row) => {
        const card = cards.get(row.dramaId);
        if (card) card.rows.push(skipRowOf(row));
        else
            cards.set(row.dramaId, {
                dramaId: row.dramaId,
                name: dramaNameOf(row),
                rows: [skipRowOf(row)],
            });
    });
    return [...cards.values()];
};
