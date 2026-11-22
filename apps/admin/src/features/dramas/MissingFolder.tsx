/*
 * 資料夾對唔到（R2 改咗名）：警告 + dropdown 揀返一個未配對嘅資料夾 + 「配對」掣 → POST /api/dramas/:id/folder
 * （W-709：揀選只改 local state，配對會 rescan 寫 D1，一定要撳掣先做）
 * Design Origin: mockup: _mockups_/admin/index.html#s4c
 */
import { Link2 } from 'lucide-react';
import { useState } from 'react';
import { pairFolder, unmappedFolders } from '../../api/endpoints';
import { useResource } from '../../data/useResource';
import { t } from '../../i18n/t';
import { errorMessage } from '../../api/errorMessage';

interface MissingFolderProps {
    dramaId: string;
    folder: string;
    etag: string | null;
    /** 有未儲存改動：配對完會重讀劇集、草稿會冇咗，唔畀配對（AU-022） */
    blocked?: boolean;
    onPaired: () => Promise<void>;
}

/** 配對（POST）→ onPaired；失敗 = error */
const usePairing = ({ dramaId, etag, onPaired }: MissingFolderProps) => {
    const [error, setError] = useState<string>();
    const [busy, setBusy] = useState(false);
    const pair = async (picked: string) => {
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
    return { error, busy, pair };
};

export function MissingFolder(props: MissingFolderProps) {
    const { folder, blocked = false } = props;
    const folders = useResource(unmappedFolders);
    const [picked, setPicked] = useState('');
    const { error, busy, pair } = usePairing(props);
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
                    disabled={picked === '' || busy || blocked}
                    onClick={() => void pair(picked)}
                >
                    <Link2 aria-hidden="true" />
                    {t('drama.pair')}
                </button>
            </div>
            {blocked && <p className="note warn">{t('drama.pairUnsaved')}</p>}
            {error && (
                <span className="err" role="alert">
                    {error}
                </span>
            )}
        </div>
    );
}
