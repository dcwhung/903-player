/*
 * ⟳ 重新掃描（POST /api/dramas/:id/scan，唔寫 D1）：結果併入草稿，本機改過嘅欄位保留，按「儲存」先寫；
 * 掃描完再試 R2 原圖自動裁切（afterScan：已儲存版本冇圖嘅 slot）
 */
import { useState } from 'react';
import { rescanDrama } from '../../api/endpoints';
import { t } from '../../i18n/t';
import { mergeRescan } from '../editor/entryDraft';
import type { EntryEditor } from '../editor/useEntryEditor';
import { errorMessage } from '../../api/errorMessage';

export const useRescan = (id: string, editor: EntryEditor, afterScan?: () => Promise<void>) => {
    const [state, setState] = useState<{ busy: boolean; message?: string }>({ busy: false });
    const run = async () => {
        setState({ busy: true });
        try {
            const result = await rescanDrama(id);
            const saved = editor.entry?.definition ?? {};
            if (result.draft) {
                const scanned = result.draft;
                editor.setDefinition((local) => mergeRescan(saved, local, scanned));
            }
            setState({ busy: false, message: t('drama.rescanned') });
            await afterScan?.();
        } catch (error) {
            setState({
                busy: false,
                message: errorMessage(error),
            });
        }
    };
    return { ...state, run };
};
