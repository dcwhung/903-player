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

export function DeleteEntry({
    entry,
    neverPublished,
}: {
    entry: LoadedEntry;
    neverPublished: boolean;
}) {
    const [confirming, setConfirming] = useState(false);
    const [error, setError] = useState<string>();
    const navigate = useNavigate();
    const { refresh } = useAdminData();
    if (!neverPublished)
        return <span className="small danger-note">{t('editor.publishedNoDelete')}</span>;
    const onConfirm = async () => {
        setConfirming(false);
        try {
            await deleteEntry(entry.kind, entry.id, entry.etag);
            await refresh();
            navigate(`/${entry.kind}`);
        } catch (deleteError) {
            setError(errorMessage(deleteError));
        }
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
                    onConfirm={() => void onConfirm()}
                    onCancel={() => setConfirming(false)}
                />
            )}
        </>
    );
}
