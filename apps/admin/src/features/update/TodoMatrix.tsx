/*
 * 待辦矩陣：Design Origin: mockup: _mockups_/admin/index.html#uB（方案 B）
 * 行 = 新內容，欄 = 資料夾 / ID / 圖片 / 排期 / 簡介；成行撳入嗰項嘅編輯頁（格入面嘅掣照去各自 target）
 */
import { CalendarDays, FileText, Folder, Hash, Image, type LucideIcon } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import type { LoadedEntry, TodoColumn, TodoRow } from '../../api/types';
import { t } from '../../i18n/t';
import { arcsOf, countOf, totalEpisodes } from '../../model/raw';
import { rowClickTo } from '../lists/rowClick';
import { MatrixCell } from './MatrixCell';
import {
    TODO_COLUMNS,
    columnLabel,
    isRowDone,
    rowMeta,
    rowTarget,
    splitName,
    todoHref,
    todoKey,
} from './todoModel';

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
    if (row.kind === 'missingFolder') return 'clickable attn';
    return isRowDone(row) ? 'clickable done' : 'clickable';
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
    const navigate = useNavigate();
    // 帶 from=todos：編輯頁照出 flow bar 同「儲存並返回待辦」
    const href = todoHref(rowTarget(row), key);
    return (
        <tr className={rowClass(row)} onClick={rowClickTo(() => void navigate(href))}>
            <th scope="row">
                {/* 鍵盤：Tab 到名 + Enter（同列表頁一樣，成行唔另設 focus 位） */}
                <Link className="row-link" to={href}>
                    <b>{title}</b>
                </Link>
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
