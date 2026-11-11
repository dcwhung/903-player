/* 未 login：Design Origin: mockup: _mockups_/admin/index.html#s1（.login） */
import { t } from '../i18n/t';
import { Brand } from './Brand';

export function LoginScreen() {
    return (
        <main className="login">
            <div className="card">
                <h1 className="sr-only">{t('app.name')}</h1>
                <Brand big />
                <p className="sub">{t('login.sub')}</p>
                <a className="btn google" href="/auth/google/start">
                    <span className="g-mark" aria-hidden="true" />
                    {t('login.google')}
                </a>
            </div>
        </main>
    );
}
