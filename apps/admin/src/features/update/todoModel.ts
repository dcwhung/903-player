/* 待辦矩陣（mockup ③ 方案 B）：欄、跳轉連結（帶 from=todos 令編輯頁出 flow bar）、尚欠項目 */
import type { LoadedEntry, TodoColumn, TodoRow } from '../../api/types';
import { t, type MessageKey } from '../../i18n/t';
import { arcsOf, countOf, totalEpisodes } from '../../model/raw';
import { arcEditorPath, dramaEditorPath } from '../../model/paths';

export const TODO_COLUMNS: readonly TodoColumn[] = [
    'folder',
    'id',
    'images',
    'schedule',
    'summary',
];

const COLUMN_LABEL: Record<TodoColumn, MessageKey> = {
    folder: 'update.colFolder',
    id: 'update.colId',
    images: 'update.colImages',
    schedule: 'update.colSchedule',
    summary: 'update.colSummary',
};

export const columnLabel = (column: TodoColumn): string => t(COLUMN_LABEL[column]);

export const FROM_TODOS = 'todos';

export const todoKey = (row: Pick<TodoRow, 'kind' | 'dramaId' | 'arcId'>): string =>
    `${row.kind}:${row.dramaId}:${row.arcId ?? ''}`;

/** API target（/dramas/x/schedule#arc）→ 加 ?from=todos&todo=key（hash 留喺最尾） */
export const todoHref = (target: string, key: string): string => {
    const [path = '', hash = ''] = target.split('#');
    const query = new URLSearchParams({ from: FROM_TODOS, todo: key });
    return `${path}?${query.toString()}${hash ? `#${hash}` : ''}`;
};

/**
 * 成行撳去邊（同列表頁一樣）：新劇 → 編輯頁；新短篇 / 新集數 → 短篇 tab 展開嗰個短篇；
 * 資料夾唔見 → 配對資料夾
 */
export const rowTarget = (row: TodoRow): string => {
    const base = dramaEditorPath(row.dramaId);
    if (row.kind === 'missingFolder') return `${base}#folder`;
    if (row.kind === 'newDrama' || row.arcId === null) return base;
    return arcEditorPath(row.dramaId, row.arcId);
};

/** 仲未做嘅「必須」格 */
export const missingOf = (row: TodoRow): string[] =>
    TODO_COLUMNS.filter((column) => row.cells[column].state === 'must').map(columnLabel);

/** 尚欠嘅設定：「尚未設定 X、Y」；冇缺嘅格（例如 draft 劇）= 空 */
export const missingText = (row: TodoRow): string => {
    const missing = missingOf(row).join('、');
    return missing ? t('update.missingLabel', { missing }) : '';
};

/** 未完成項目嘅文字：「名（尚未設定 X、Y）」；冇缺嘅格就淨係出名 */
export const incompleteText = (name: string, row: TodoRow): string => {
    const missing = missingText(row);
    return missing ? t('update.incompleteLabel', { name, missing }) : name;
};

export const isRowDone = (row: TodoRow): boolean =>
    TODO_COLUMNS.every((column) => ['done', 'na'].includes(row.cells[column].state));

/** 必須處理嘅格數（「尚有 N 項必須處理」） */
export const mustCount = (rows: readonly TodoRow[]): number =>
    rows.reduce((sum, row) => sum + missingOf(row).length, 0);

/** 待辦頁統計卡：新內容行數、必須格、選填格、已完成行 */
export const todoStats = (rows: readonly TodoRow[]) => ({
    rows: rows.length,
    must: mustCount(rows),
    optional: rows.reduce(
        (sum, row) =>
            sum + TODO_COLUMNS.filter((column) => row.cells[column].state === 'optional').length,
        0,
    ),
    done: rows.filter(isRowDone).length,
});

/** API name = 「劇名 · 短篇名」；短篇行顯示短篇名，劇名放 meta */
export const splitName = (row: TodoRow): { title: string; drama: string } => {
    const at = row.name.lastIndexOf(' · ');
    if (row.arcId === null || at === -1) return { title: row.name, drama: '' };
    return { title: row.name.slice(at + 3), drama: row.name.slice(0, at) };
};

/** 行嘅集數（新劇 = 全劇、新短篇 = 嗰個短篇）；未載入 / 搵唔到 = undefined */
export const episodesOf = (row: TodoRow, entries: readonly LoadedEntry[]): number | undefined => {
    const drama = entries.find((e) => e.kind === 'dramas' && e.id === row.dramaId);
    if (!drama) return undefined;
    if (row.arcId === null) return totalEpisodes(drama.definition);
    const arc = arcsOf(drama.definition).find((a) => a.id === row.arcId);
    return arc ? countOf(arc) : undefined;
};

export const rowMeta = (row: TodoRow, episodes: number | undefined): string => {
    const { drama } = splitName(row);
    const count = episodes ?? 0;
    const parts: Record<TodoRow['kind'], string[]> = {
        newDrama: [t('update.metaNewDrama', { count })],
        newArc: [drama, t('update.metaNewArc', { count })],
        newEpisodes: [drama, t('update.metaNewEpisodes')],
        missingFolder: [t('update.metaMissingFolder')],
    };
    return parts[row.kind].filter(Boolean).join(' · ');
};
