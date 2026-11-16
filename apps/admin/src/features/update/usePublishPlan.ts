/*
 * 今次發佈嘅選擇 + 去確認發佈頁嘅路徑：處理待辦頁（剔格、「下一步」）同 Stepper「確認發佈」共用，
 * 保證兩邊同一個選擇、同一套條件。
 * path：GET /api/changes 未載入 / 載入失敗 / 冇嘢揀 → undefined（「下一步」灰嘅時候 stepper 都唔畀跳）
 */
import type { PublishSelection } from '../../api/types';
import { useAdminData } from '../../data/AdminData';
import { usePublishSelection } from './PublishSelection';
import { hasAnythingToPublish, publishPathOf, selectionOf } from './selectionModel';

export interface PublishPlan {
    selection: PublishSelection;
    path: string | undefined;
}

export const usePublishPlan = (): PublishPlan => {
    const { todos, changes } = useAdminData();
    const { unpicked } = usePublishSelection();
    const data = changes.data;
    const selection = selectionOf(todos.data?.rows ?? [], data?.appearance, unpicked);
    const ready = !changes.error && data !== undefined;
    const path =
        ready && hasAnythingToPublish(selection, data.others?.items ?? [])
            ? publishPathOf(selection)
            : undefined;
    return { selection, path };
};
