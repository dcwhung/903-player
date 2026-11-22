/*
 * 編輯頁「未儲存就離開」守衛嘅規則（AU-023）：草稿只喺 component state，離開編輯頁就冇。
 * 唔使問嘅跳轉：
 *  - 同一個編輯頁嘅分頁（/dramas/<id> ⇄ /dramas/<id>/arcs…；草稿保留）
 *  - 編輯頁自己喺儲存 / 刪除之後做嘅跳轉（ownNavigation：改 ID 搬去新 URL、返待辦、返列表）——
 *    嗰刻 React 未必 render 咗「已經冇未儲存改動」，所以唔靠 dirty，由跳轉自己講明
 */
import type { BlockerFunction, NavigateOptions } from 'react-router-dom';
import { sameEditorPath } from '../../model/paths';

const OWN_NAVIGATION_KEY = 'editorOwnNavigation';

/** navigate(to, ownNavigation(options))：編輯頁自己嘅跳轉，守衛唔問 */
export const ownNavigation = (options: NavigateOptions = {}): NavigateOptions => ({
    ...options,
    state: { [OWN_NAVIGATION_KEY]: true },
});

const isOwnNavigation = (state: unknown): boolean =>
    typeof state === 'object' &&
    state !== null &&
    (state as Record<string, unknown>)[OWN_NAVIGATION_KEY] === true;

/**
 * 有未儲存改動時，呢次跳轉要唔要問。
 * 上一頁 / 下一頁（POP）去到一個當初由編輯頁自己跳去嘅 history entry 照問：嗰個 state 係舊嗰次跳轉留低嘅
 */
export const blocksLeave: BlockerFunction = ({ currentLocation, nextLocation, historyAction }) => {
    if (sameEditorPath(currentLocation.pathname, nextLocation.pathname)) return false;
    return historyAction === 'POP' || !isOwnNavigation(nextLocation.state);
};
