import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import styles from './Toast.module.css';
import { hideToast, useToast } from './toastStore';

/** 提示顯示幾耐先淡走（_mockups_/bookmark TOAST_MS） */
export const TOAST_DURATION_MS = 1800;

/**
 * 全 app 一個短提示（showToast），浮喺頁底（有 mini player 就喺佢上面）。
 * live region 一直掛住（空都係），讀屏先讀到新出嘅字；淡入淡出只喺冇要求減少動態先有
 */
export const Toast = () => {
    const message = useToast();
    const id = message?.visible ? message.id : null;
    useEffect(() => {
        if (id === null) return undefined;
        const timer = setTimeout(() => hideToast(id), TOAST_DURATION_MS);
        return () => clearTimeout(timer);
    }, [id]);
    return createPortal(
        <div
            className={styles.toast}
            role="status"
            aria-live="polite"
            data-visible={String(message?.visible ?? false)}
        >
            {message?.text}
        </div>,
        document.body,
    );
};
