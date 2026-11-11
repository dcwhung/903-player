/* 待辦矩陣（mockup ③ 方案 B）：欄、跳轉連結（帶 from=todos 令編輯頁出 flow bar）、尚欠項目 */
import type { TodoColumn, TodoRow } from '../../api/types';
import { t, type MessageKey } from '../../i18n/t';

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

/** 仲未做嘅「必須」格 */
export const missingOf = (row: TodoRow): string[] =>
    TODO_COLUMNS.filter((column) => row.cells[column].state === 'must').map(columnLabel);

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
