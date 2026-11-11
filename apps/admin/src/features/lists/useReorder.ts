/* 拖 ⠿ 放手即存：先喺畫面換次序，再 PUT /api/order/:kind；失敗就還原 + 顯示錯誤 */
import { useState } from 'react';
import { putOrder } from '../../api/endpoints';
import type { EntryKind } from '../../api/types';
import { useAdminData } from '../../data/AdminData';
import { t } from '../../i18n/t';
import { useToast } from '../../ui/Toast';

export const useReorder = (kind: EntryKind) => {
    const { refresh } = useAdminData();
    const toast = useToast();
    const [pendingIds, setPendingIds] = useState<string[] | null>(null);
    const [error, setError] = useState<string>();
    const reorder = async (ids: string[]) => {
        setPendingIds(ids);
        setError(undefined);
        try {
            await putOrder(kind, ids);
            toast(t('list.reordered'));
            await refresh();
        } catch (orderError) {
            setError(orderError instanceof Error ? orderError.message : String(orderError));
        } finally {
            setPendingIds(null);
        }
    };
    return { pendingIds, error, reorder };
};

/** 樂觀次序：未存好之前用新次序顯示 */
export const applyOrder = <T extends { id: string }>(
    items: readonly T[],
    ids: string[] | null,
): T[] => (ids === null ? [...items] : ids.flatMap((id) => items.filter((item) => item.id === id)));
