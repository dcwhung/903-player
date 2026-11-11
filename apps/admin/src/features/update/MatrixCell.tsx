/* 矩陣一格：紅「設定」= 必須、灰「＋」= 選填、✓ = 已做、– = 唔適用（mockup ③ .cell） */
import { Check, Minus, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { TodoCell, TodoColumn } from '../../api/types';
import { t } from '../../i18n/t';
import { columnLabel, todoHref } from './todoModel';

interface MatrixCellProps {
    cell: TodoCell;
    column: TodoColumn;
    rowKey: string;
    rowName: string;
}

export function MatrixCell({ cell, column, rowKey, rowName }: MatrixCellProps) {
    const name = `${rowName}：${columnLabel(column)}`;
    if (cell.state === 'done')
        return (
            <td className="ok">
                <Check aria-label={`${name} ${t('update.doneCell')}`} />
            </td>
        );
    if (cell.state === 'na' || !cell.target)
        return (
            <td className="na">
                <Minus aria-label={`${name} ${t('update.naCell')}`} />
            </td>
        );
    const href = todoHref(cell.target, rowKey);
    if (cell.state === 'must')
        return (
            <td>
                <Link className="cell must" to={href} aria-label={name}>
                    {column === 'folder' ? t('update.mustPair') : t('update.mustSet')}
                </Link>
            </td>
        );
    return (
        <td>
            <Link className="cell" to={href} aria-label={t('update.optional', { column: name })}>
                <Plus aria-hidden="true" />
            </Link>
        </td>
    );
}
