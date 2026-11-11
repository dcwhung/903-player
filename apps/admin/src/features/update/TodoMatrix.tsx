/*
 * 待辦矩陣：Design Origin: mockup: _mockups_/admin/index.html#uB（方案 B）
 * 行 = 新內容，欄 = 資料夾 / ID / 圖片 / 排期 / 簡介
 */
import { CalendarDays, FileText, Folder, Hash, Image, type LucideIcon } from 'lucide-react';
import type { LoadedEntry, TodoColumn, TodoRow } from '../../api/types';
import { t } from '../../i18n/t';
import { arcsOf, countOf, totalEpisodes } from '../../model/raw';
import { MatrixCell } from './MatrixCell';
import { TODO_COLUMNS, columnLabel, isRowDone, rowMeta, splitName, todoKey } from './todoModel';

const COLUMN_ICON: Record<TodoColumn, LucideIcon> = {
    folder: Folder,
    id: Hash,
    images: Image,
    schedule: CalendarDays,
    summary: FileText,
};

const episodesOf = (row: TodoRow, entries: readonly LoadedEntry[]): number | undefined => {
    const drama = entries.find((e) => e.kind === 'dramas' && e.id === row.dramaId);
    if (!drama) return undefined;
    if (row.arcId === null) return totalEpisodes(drama.definition);
    const arc = arcsOf(drama.definition).find((a) => a.id === row.arcId);
    return arc ? countOf(arc) : undefined;
};

const rowClass = (row: TodoRow) => {
    if (row.kind === 'missingFolder') return 'attn';
    return isRowDone(row) ? 'done' : undefined;
};

function MatrixHead() {
    return (
        <thead>
            <tr>
                <th scope="col">{t('update.colItem')}</th>
                {TODO_COLUMNS.map((column) => {
                    const Icon = COLUMN_ICON[column];
                    return (
                        <th scope="col" key={column}>
                            <Icon aria-hidden="true" /> {columnLabel(column)}
                        </th>
                    );
                })}
            </tr>
        </thead>
    );
}

function MatrixRow({ row, episodes }: { row: TodoRow; episodes: number | undefined }) {
    const key = todoKey(row);
    const { title } = splitName(row);
    return (
        <tr className={rowClass(row)}>
            <th scope="row">
                <b>{title}</b>
                <span className="meta">{rowMeta(row, episodes)}</span>
            </th>
            {TODO_COLUMNS.map((column) => (
                <MatrixCell
                    key={column}
                    cell={row.cells[column]}
                    column={column}
                    rowKey={key}
                    rowName={title}
                />
            ))}
        </tr>
    );
}

export function TodoMatrix({
    rows,
    entries,
}: {
    rows: readonly TodoRow[];
    entries: readonly LoadedEntry[];
}) {
    return (
        <div className="card flush table-wrap">
            <table className="matrix">
                <caption className="sr-only">{t('update.matrixLabel')}</caption>
                <MatrixHead />
                <tbody>
                    {rows.map((row) => (
                        <MatrixRow
                            key={todoKey(row)}
                            row={row}
                            episodes={episodesOf(row, entries)}
                        />
                    ))}
                </tbody>
            </table>
        </div>
    );
}
