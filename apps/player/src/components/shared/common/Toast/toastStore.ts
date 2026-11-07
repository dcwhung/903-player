import { createValueStore } from '../../../../hooks/flagStore';

/** 短提示（例如「已加入收藏」）：id 每次 +1，同一句再出都會重新計時 */
export interface ToastMessage {
    id: number;
    text: string;
    /** false = 淡走緊（字留住，淡出期間唔會變空框） */
    visible: boolean;
}

const store = createValueStore<ToastMessage | null>(null);
let lastId = 0;

/** 全 app 共用一個提示：新嘅蓋過舊嘅 */
export const showToast = (text: string): void => {
    lastId += 1;
    store.set({ id: lastId, text, visible: true });
};

/** 只收自己嗰個（之後已經出咗新提示就唔理） */
export const hideToast = (id: number): void => {
    const shown = store.peek();
    if (shown?.id === id) store.set({ ...shown, visible: false });
};

export const useToast = store.useValue;
