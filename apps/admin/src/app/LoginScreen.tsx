/*
 * 未 login：全頁 banner 背景 + 毛玻璃登入卡（細 banner + Admin pill → 標題 → 一句說明 →「使用 Google 登入」）。
 * Design Origin: mockup: _mockups_/admin-login/index.html#3（用戶 2026-11-12 揀款 3）
 * Google 掣跟官方「Sign in with Google」淺 / 深色款（--gsi-* token）；login 完返返而家嘅深連結（S-809）
 */
import { useLocation } from 'react-router-dom';
import { t } from '../i18n/t';
import { BANNER_PATH, Brand } from './Brand';
import { loginHref } from './loginHref';

/** Google 官方四色 G（48×48 viewBox；顏色係品牌規定，唔跟主題） */
function GoogleLogo() {
    return (
        <svg viewBox="0 0 48 48" aria-hidden="true">
            <path
                fill="#EA4335"
                d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
            />
            <path
                fill="#4285F4"
                d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
            />
            <path
                fill="#FBBC05"
                d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
            />
            <path
                fill="#34A853"
                d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
            />
        </svg>
    );
}

export function LoginScreen() {
    const location = useLocation();
    return (
        <main className="login">
            {/* 背景 banner 純裝飾（卡入面已有一張有 alt 嘅 banner） */}
            <div
                className="login-bg"
                aria-hidden="true"
                style={{ backgroundImage: `url("${BANNER_PATH}")` }}
            />
            <div className="login-card">
                <Brand />
                <h1>{t('login.title')}</h1>
                <p>{t('login.sub')}</p>
                <a className="gsi" href={loginHref(location)}>
                    <GoogleLogo />
                    {t('login.google')}
                </a>
            </div>
        </main>
    );
}
