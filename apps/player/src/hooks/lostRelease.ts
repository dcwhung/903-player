/** 判斷「放手唔見咗」要用嘅 pointer event 欄位（React / DOM 都有） */
interface PointerLike {
    type: string;
    pointerId: number;
    pointerType: string;
    buttons: number;
}

/**
 * 滑鼠喺元素外（例如遮罩 / 背景）放手：元素收唔到 pointerup，手勢留低咗。
 * 同一個 pointer 再按低，或者滑鼠冇撳住掣都郁緊，就當之前嗰下已經放咗手
 */
export const isLostRelease = (activePointerId: number | undefined, event: PointerLike): boolean =>
    activePointerId === event.pointerId &&
    (event.type === 'pointerdown' || (event.pointerType === 'mouse' && event.buttons === 0));
