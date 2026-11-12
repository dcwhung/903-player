/*
 * 未 login：全頁 banner 背景 + 毛玻璃登入卡（細 banner + Admin pill → 標題 → 一句說明 →「使用 Google 登入」）。
 * Design Origin: mockup: _mockups_/admin-login/index.html#3（用戶 2026-11-12 揀款 3）
 * Google 掣跟官方「Sign in with Google」淺 / 深色款（--gsi-* token）；login 完返返而家嘅深連結（S-809）
 */
import { useLocation } from 'react-router-dom';
import googleG from '../assets/svg/logos/google-g.svg';
import { t } from '../i18n/t';
import { BANNER_PATH, Brand } from './Brand';
import { loginHref } from './loginHref';

/** 同 CSS .gsi img 一樣（20px） */
const GOOGLE_G_SIZE = 20;

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
                    {/* Google 官方四色 G（顏色係品牌規定，唔跟主題）；隔籬已有文字，純裝飾 */}
                    <img src={googleG} alt="" width={GOOGLE_G_SIZE} height={GOOGLE_G_SIZE} />
                    {t('login.google')}
                </a>
            </div>
        </main>
    );
}
