/* 未 login：Design Origin: mockup: _mockups_/admin/index.html#s1（.login）；login 完返返而家嘅深連結（S-809） */
import { useLocation } from 'react-router-dom';
import { t } from '../i18n/t';
import { Brand } from './Brand';
import { loginHref } from './loginHref';

export function LoginScreen() {
    const location = useLocation();
    return (
        <main className="login">
            <div className="card">
                <h1 className="sr-only">{t('app.name')}</h1>
                <Brand big />
                <p className="sub">{t('login.sub')}</p>
                <a className="btn google" href={loginHref(location)}>
                    <span className="g-mark" aria-hidden="true" />
                    {t('login.google')}
                </a>
            </div>
        </main>
    );
}
