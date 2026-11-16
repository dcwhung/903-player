/*
 * Stepper「確認發佈」嘅去向：同更新頁「下一步」一樣（同一個選擇、同一套條件）；
 * GET /api/changes 未載入 / 載入失敗 / 冇嘢揀 → undefined（「下一步」灰嘅時候 stepper 都唔畀跳）
 */
import { useAdminData } from '../../data/AdminData';
import { usePublishSelection } from './PublishSelection';
import { hasAnythingToPublish, publishPathOf, selectionOf } from './selectionModel';

export const usePublishStepPath = (): string | undefined => {
    const { todos, changes } = useAdminData();
    const { unpicked } = usePublishSelection();
    const data = changes.data;
    if (changes.error || !data) return undefined;
    const selection = selectionOf(todos.data?.rows ?? [], data.appearance, unpicked);
    return hasAnythingToPublish(selection, data.others?.items ?? [])
        ? publishPathOf(selection)
        : undefined;
};
