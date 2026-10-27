import { useState } from 'react';

/**
 * mutable box：useState 整一次，成個 component 生命期都係同一個 object（穩定，可以做 effect / memo 依賴）。
 * 手勢狀態用：handlers factory 喺 render 時建立，React lint 唔畀 render 時將 useRef 傳入函數
 */
export interface Box<T> {
    current: T;
}

export const useBox = <T>(initial: T): Box<T> => useState<Box<T>>(() => ({ current: initial }))[0];
