/* 刪除（只限從未發佈）：確認先刪；發佈過嘅冇刪除掣，提示用「下架」（mockup #s9） */
import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { deleteEntry } from '../../api/endpoints';
import type { LoadedEntry } from '../../api/types';
import { useAdminData } from '../../data/AdminData';
import { t } from '../../i18n/t';
import { nameOf } from '../../model/raw';
import { ConfirmDialog } from '../../ui/ConfirmDialog';
import { errorMessage } from '../../api/errorMessage';
import { ownNavigation } from './leaveRules';

/** 刪除 → 成功就返列表；失敗 = error */
const useDeleteEntry = (entry: LoadedEntry) => {
    const [error, setError] = useState<string>();
    const navigate = useNavigate();
    const { refresh, entries } = useAdminData();
    const remove = async () => {
        try {
            await deleteEntry(entry.kind, entry.id, entry.etag);
        } catch (deleteError) {
            setError(errorMessage(deleteError));
            return;
        }
        // 即刻返列表（replace：上一頁唔會返去已刪除嘅項目）；重讀全部 entry 可以好耐，喺背景做，
        // 所以先喺已載入嘅 entries 拎走佢，列表唔會閃返已刪除嗰行
        entries.mutate((list) =>
            list?.filter((item) => item.kind !== entry.kind || item.id !== entry.id),
        );
        // 草稿有未儲存改動都唔問（項目已經刪咗，AU-023）
        void navigate(`/${entry.kind}`, ownNavigation({ replace: true }));
        void refresh();
    };
    return { error, remove };
};

export function DeleteEntry({
    entry,
    neverPublished,
}: {
    entry: LoadedEntry;
    neverPublished: boolean;
}) {
    const [confirming, setConfirming] = useState(false);
    const { error, remove } = useDeleteEntry(entry);
    if (!neverPublished)
        return <span className="small danger-note">{t('editor.publishedNoDelete')}</span>;
    const onConfirm = () => {
        setConfirming(false);
        void remove();
    };
    return (
        <>
            <button type="button" className="ghost-danger" onClick={() => setConfirming(true)}>
                <Trash2 aria-hidden="true" />
                {t('editor.delete')}
            </button>
            {error && (
                <span className="err small" role="alert">
                    {error}
                </span>
            )}
            {confirming && (
                <ConfirmDialog
                    title={t('editor.deleteTitle', { name: nameOf(entry.definition, entry.id) })}
                    body={t('editor.deleteBody')}
                    confirmLabel={t('editor.delete')}
                    confirmIcon={<Trash2 aria-hidden="true" />}
                    danger
                    onConfirm={onConfirm}
                    onCancel={() => setConfirming(false)}
                />
            )}
        </>
    );
}
