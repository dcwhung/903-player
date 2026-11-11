/*
 * 資料夾對唔到（R2 改咗名）：警告 + dropdown 揀返一個未配對嘅資料夾 → POST /api/dramas/:id/folder
 * Design Origin: mockup: _mockups_/admin/index.html#s4c
 */
import { useState } from 'react';
import { pairFolder, unmappedFolders } from '../../api/endpoints';
import { useResource } from '../../data/useResource';
import { t } from '../../i18n/t';

interface MissingFolderProps {
    dramaId: string;
    folder: string;
    etag: string | null;
    onPaired: () => Promise<void>;
}

export function MissingFolder({ dramaId, folder, etag, onPaired }: MissingFolderProps) {
    const folders = useResource(unmappedFolders);
    const [error, setError] = useState<string>();
    const onPick = async (picked: string) => {
        if (picked === '') return;
        try {
            await pairFolder(dramaId, picked, etag);
            await onPaired();
        } catch (pairError) {
            setError(pairError instanceof Error ? pairError.message : String(pairError));
        }
    };
    return (
        <div className="field wide" id="folder">
            <span>{t('fields.audio')}</span>
            <p className="note warn">{t('drama.missingFolder', { folder: `${folder}/` })}</p>
            <div className="readonly-box">
                <select
                    aria-label={t('drama.pickFolder')}
                    defaultValue=""
                    onChange={(e) => void onPick(e.target.value)}
                >
                    <option value="">{t('drama.pickFolder')}</option>
                    {(folders.data ?? []).map((name) => (
                        <option key={name} value={name}>{`${name}/`}</option>
                    ))}
                </select>
            </div>
            {error && (
                <span className="err" role="alert">
                    {error}
                </span>
            )}
        </div>
    );
}
