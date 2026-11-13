/*
 * 選擇發佈：更新頁剔走咗嘅項目（in-memory，跨頁保留：去確認發佈再「返回待辦」照舊）。
 * 只記剔走咗嘅 key，新 selectable 行 / 新 App 外觀改動預設勾選（Q1）；reload = 預設選擇；發佈成功清空
 */
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { EMPTY_UNPICKED, type AppearanceItem, type Unpicked } from './selectionModel';

export interface PublishSelectionState {
    unpicked: Unpicked;
    toggleContent: (key: string) => void;
    toggleAppearance: (item: AppearanceItem) => void;
    reset: () => void;
}

const PublishSelectionContext = createContext<PublishSelectionState | null>(null);

const toggled = <T,>(set: ReadonlySet<T>, value: T): Set<T> => {
    const next = new Set(set);
    if (!next.delete(value)) next.add(value);
    return next;
};

export function PublishSelectionProvider({ children }: { children: ReactNode }) {
    const [unpicked, setUnpicked] = useState<Unpicked>(EMPTY_UNPICKED);
    const toggleContent = useCallback(
        (key: string) => setUnpicked((u) => ({ ...u, content: toggled(u.content, key) })),
        [],
    );
    const toggleAppearance = useCallback(
        (item: AppearanceItem) =>
            setUnpicked((u) => ({ ...u, appearance: toggled(u.appearance, item) })),
        [],
    );
    const reset = useCallback(() => setUnpicked(EMPTY_UNPICKED), []);
    const value = useMemo(
        () => ({ unpicked, toggleContent, toggleAppearance, reset }),
        [unpicked, toggleContent, toggleAppearance, reset],
    );
    return (
        <PublishSelectionContext.Provider value={value}>
            {children}
        </PublishSelectionContext.Provider>
    );
}

export const usePublishSelection = (): PublishSelectionState => {
    const value = useContext(PublishSelectionContext);
    if (!value) throw new Error('usePublishSelection must be used inside PublishSelectionProvider');
    return value;
};
