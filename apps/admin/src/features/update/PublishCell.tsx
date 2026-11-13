/*
 * 待辦矩陣最後一欄「發佈」（mockup: _mockups_/admin-selective-publish/index.html#a）：
 * selectable = 勾選框（預設勾）；incomplete = 灰色勾選框 +「未完成」；always = 「一併發佈」（新集數）/ –（資料夾不見）。
 * 勾選框包喺 label 入面：撳格唔會觸發成行跳去編輯頁（rowClick 略過 label / input）
 */
import { Minus } from 'lucide-react';
import type { TodoRow } from '../../api/types';
import { t } from '../../i18n/t';
import { missingOf, splitName } from './todoModel';

interface PublishCellProps {
    row: TodoRow;
    picked: boolean;
    onToggle: (key: string) => void;
}

export function PublishCell({ row, picked, onToggle }: PublishCellProps) {
    const { title } = splitName(row);
    if (row.publish === 'selectable')
        return (
            <td className="pick-cell">
                <label>
                    <input
                        type="checkbox"
                        className="pick"
                        checked={picked}
                        onChange={() => onToggle(row.key)}
                        aria-label={t('update.pickLabel', { name: title })}
                    />
                </label>
            </td>
        );
    if (row.publish === 'incomplete')
        return (
            <td className="pick-cell">
                <label>
                    <input
                        type="checkbox"
                        className="pick"
                        disabled
                        aria-label={t('update.incompleteLabel', {
                            name: title,
                            missing: missingOf(row).join('、'),
                        })}
                    />
                    <span className="lock">{t('update.incomplete')}</span>
                </label>
            </td>
        );
    if (row.kind === 'missingFolder')
        return (
            <td className="na">
                <Minus aria-label={`${title}：${t('update.colPublish')} ${t('update.naCell')}`} />
            </td>
        );
    return <td className="pick-cell muted small">{t('update.always')}</td>;
}
