import type { DragEvent } from 'react';

/**
 * 擋原生拖放：滑鼠拖卡 / 捽碟時拖到節目圖會觸發 dragstart（之後 pointercancel，手勢斷咗）。
 * CSS 一邊（Safari 嘅 -webkit-user-drag）見 src/styles/gesture.module.css。
 */
export const preventDragStart = (event: DragEvent<HTMLElement>): void => {
    event.preventDefault();
};
