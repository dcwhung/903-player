/*
 * 「＋ 新增廣播劇」：新劇由 R2 掃描自動建立（plan：新資料夾 → draft 劇），所以呢度解釋 + 一撳重新掃描。
 * 用 ConfirmDialog shell（S-811）：focus 入「關閉」、Tab 循環、Esc 關、關閉後 focus 返 ＋ 掣
 */
import { RefreshCw } from 'lucide-react';
import { t } from '../../i18n/t';
import { ConfirmDialog } from '../../ui/ConfirmDialog';

export function NewDramaDialog({
    onRescan,
    onClose,
}: {
    onRescan: () => void;
    onClose: () => void;
}) {
    return (
        <ConfirmDialog
            title={t('list.addDrama')}
            body={t('list.newDramaHelp')}
            cancelLabel={t('list.close')}
            confirmLabel={t('scan.rescan')}
            confirmIcon={<RefreshCw aria-hidden="true" />}
            onConfirm={onRescan}
            onCancel={onClose}
        />
    );
}
