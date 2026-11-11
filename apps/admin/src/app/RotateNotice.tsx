/*
 * 直向手機（闊度 < 720px）：成頁只顯示提示（CSS media query 切換，唔使 JS）。
 * Design Origin: mockup: _mockups_/admin-style/index.html#g（同 403 頁同一版式：banner → 插圖圓 → 標題 → 一行說明；
 * icon = 直機 → 橫機，單向箭咀）
 */
import { t } from '../i18n/t';
import { Brand } from './Brand';

/** mockup ⑦ 嘅轉向 icon（48×48 viewBox） */
function RotateArt() {
    return (
        <svg viewBox="0 0 48 48" aria-hidden="true">
            <rect x="6" y="6" width="14" height="26" rx="3" />
            <path d="M11 10h4" />
            <rect x="20" y="28" width="24" height="14" rx="3" />
            <path d="M40 33v4" />
            <path d="M24 9c7 0 13 5 13 14" />
            <path d="m33 19 4 4 4-4" />
        </svg>
    );
}

export function RotateNotice() {
    return (
        <div className="rotate-note notice" data-testid="rotate-note">
            <div className="notice-box">
                <Brand />
                <div className="notice-art">
                    <RotateArt />
                </div>
                <h2>{t('app.rotateTitle')}</h2>
                <p>{t('app.rotateBody')}</p>
            </div>
        </div>
    );
}
