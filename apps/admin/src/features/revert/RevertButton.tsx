/*
 * 「還原」掣：淺紅底 + 紅字（同「刪除」ghost-danger 一樣，mockup admin-revert .revert-btn）；
 * round = 圖位鉛筆旁嘅圓形掣（淨 icon，aria-label 寫明對象）。
 * blocked = 有未儲存改動：灰咗，title 講原因
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
    blocked?: string | undefined;
}

export function RevertButton({ label, onClick, round = false, blocked }: RevertButtonProps) {
    return (
        <button
            type="button"
            className={round ? 'slot-revert' : 'revert-btn'}
            aria-label={label}
            title={blocked ?? label}
            disabled={blocked !== undefined}
            onClick={onClick}
        >
            <Undo2 aria-hidden="true" />
            {!round && t('revert.button')}
        </button>
    );
}
