/*
 * 「還原」掣：淺紅底 + 紅字（同「刪除」ghost-danger 一樣，mockup admin-revert .revert-btn）；
 * round = 圖位鉛筆旁嘅圓形掣（淨 icon，aria-label 寫明對象）。
 * blocked = 有未儲存改動：唔顯示（用戶 2026-11-15：所有頁面 disabled 嘅還原掣隱藏；「已修改」照出）
 */
import { Undo2 } from 'lucide-react';
import type { MouseEvent } from 'react';
import { t } from '../../i18n/t';

interface RevertButtonProps {
    /** aria-label（例如「還原橫圖」） */
    label: string;
    /** 收 event：RevertFlow 用 currentTarget 記低觸發掣（還原完搬 focus，S-1007） */
    onClick: (event: MouseEvent<HTMLButtonElement>) => void;
    round?: boolean;
    blocked?: boolean;
}

export function RevertButton({
    label,
    onClick,
    round = false,
    blocked = false,
}: RevertButtonProps) {
    if (blocked) return null;
    return (
        <button
            type="button"
            className={round ? 'slot-revert' : 'revert-btn'}
            aria-label={label}
            title={label}
            onClick={onClick}
        >
            <Undo2 aria-hidden="true" />
            {!round && t('revert.button')}
        </button>
    );
}
