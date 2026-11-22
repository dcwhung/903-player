/*
 * 「刪除」排程掣：確認先刪（AU-022；之前一撳即刪）。掣面淨係「刪除」，讀屏名「刪除排程」。
 * 刪完會重讀劇集，所以其他分頁有未儲存改動（disabled）時唔畀撳
 */
import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { t } from '../../i18n/t';
import { ConfirmDialog } from '../../ui/ConfirmDialog';

interface DeleteScheduleProps {
    disabled: boolean;
    onConfirm: () => void;
}

export function DeleteSchedule({ disabled, onConfirm }: DeleteScheduleProps) {
    const [confirming, setConfirming] = useState(false);
    const confirm = () => {
        setConfirming(false);
        onConfirm();
    };
    return (
        <>
            <button
                type="button"
                className="ghost-danger"
                aria-label={t('schedule.deleteScheduleLabel')}
                disabled={disabled}
                onClick={() => setConfirming(true)}
            >
                <Trash2 aria-hidden="true" />
                {t('schedule.deleteSchedule')}
            </button>
            {confirming && (
                <ConfirmDialog
                    title={t('schedule.deleteTitle')}
                    body={t('schedule.deleteBody')}
                    confirmLabel={t('schedule.deleteSchedule')}
                    confirmIcon={<Trash2 aria-hidden="true" />}
                    danger
                    onConfirm={confirm}
                    onCancel={() => setConfirming(false)}
                />
            )}
        </>
    );
}
