import { createContext, useContext, useId, type ReactNode } from 'react';
import { t } from '../../../../i18n/t';
import styles from './SavedTab.module.css';

/** 收藏行共用嘅移除提示 id（冇 provider 就冇提示） */
const RemoveHintContext = createContext<string | undefined>(undefined);

/** 收藏行嘅 aria-describedby：指去成個收藏區共用嗰粒隱藏提示 */
export const useRemoveHintId = (): string | undefined => useContext(RemoveHintContext);

/**
 * 「向左滑動或者撳刪除鍵移除收藏」（B2b）：唔用 title（hover 唔好出 tooltip），
 * 成個收藏區得一粒畫面唔顯示嘅說明，每行用 aria-describedby 指過嚟，唔使每行重複一粒
 */
export const RemoveHintProvider = ({ children }: { children: ReactNode }) => {
    const id = useId();
    return (
        <RemoveHintContext.Provider value={id}>
            <span id={id} className={styles.srOnly}>
                {t('bookmark.removeHint')}
            </span>
            {children}
        </RemoveHintContext.Provider>
    );
};
