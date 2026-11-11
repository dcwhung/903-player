/*
 * 資料夾對唔到（R2 改咗名）：警告 + dropdown 揀返一個未配對嘅資料夾 + 「配對」掣 → POST /api/dramas/:id/folder
 * （W-709：揀選只改 local state，配對會 rescan 寫 D1，一定要撳掣先做）
 * Design Origin: mockup: _mockups_/admin/index.html#s4c
 */
import { useState } from 'react';
import { pairFolder, unmappedFolders } from '../../api/endpoints';
import { useResource } from '../../data/useResource';
import { t } from '../../i18n/t';
import { errorMessage } from '../../api/errorMessage';

interface MissingFolderProps {
    dramaId: string;
    folder: string;
    etag: string | null;
    onPaired: () => Promise<void>;
}

export function MissingFolder({ dramaId, folder, etag, onPaired }: MissingFolderProps) {
    const folders = useResource(unmappedFolders);
    const [error, setError] = useState<string>();
    const [picked, setPicked] = useState('');
    const [busy, setBusy] = useState(false);
    const onPair = async () => {
        setBusy(true);
        try {
            await pairFolder(dramaId, picked, etag);
            await onPaired();
        } catch (pairError) {
            setError(errorMessage(pairError));
        } finally {
            setBusy(false);
        }
    };
    return (
        <div className="field wide" id="folder">
            <span>{t('fields.audio')}</span>
            <p className="note warn">{t('drama.missingFolder', { folder: `${folder}/` })}</p>
            <div className="readonly-box">
                <select
                    aria-label={t('drama.pickFolder')}
                    value={picked}
                    onChange={(e) => setPicked(e.target.value)}
                >
                    <option value="">{t('drama.pickFolder')}</option>
                    {(folders.data ?? []).map((name) => (
                        <option key={name} value={name}>{`${name}/`}</option>
                    ))}
                </select>
                <button
                    type="button"
                    className="primary"
                    disabled={picked === '' || busy}
                    onClick={() => void onPair()}
                >
                    {t('drama.pair')}
                </button>
            </div>
            {error && (
                <span className="err" role="alert">
                    {error}
                </span>
            )}
        </div>
    );
}
