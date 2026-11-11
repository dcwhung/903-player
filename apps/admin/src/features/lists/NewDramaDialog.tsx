/*
 * 「＋ 新增廣播劇」：新劇由 R2 掃描自動建立（plan：新資料夾 → draft 劇），所以呢度解釋 + 一撳重新掃描
 */
import { RefreshCw } from 'lucide-react';
import { useEffect, useId, useRef } from 'react';
import { t } from '../../i18n/t';

export function NewDramaDialog({
    onRescan,
    onClose,
}: {
    onRescan: () => void;
    onClose: () => void;
}) {
    const titleId = useId();
    const closeRef = useRef<HTMLButtonElement>(null);
    useEffect(() => closeRef.current?.focus(), []);
    return (
        <div className="scrim" onKeyDown={(event) => event.key === 'Escape' && onClose()}>
            <div className="card" role="dialog" aria-modal="true" aria-labelledby={titleId}>
                <h3 id={titleId}>{t('list.addDrama')}</h3>
                <p className="sub">{t('list.newDramaHelp')}</p>
                <div className="actions end">
                    <button type="button" ref={closeRef} onClick={onClose}>
                        {t('list.close')}
                    </button>
                    <button type="button" className="primary" onClick={onRescan}>
                        <RefreshCw aria-hidden="true" />
                        {t('scan.rescan')}
                    </button>
                </div>
            </div>
        </div>
    );
}
