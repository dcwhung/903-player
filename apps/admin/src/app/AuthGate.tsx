/* /api/me：401 → login 畫面；其他錯誤 → 重試；有 session → children(email, logout) */
import { RefreshCw } from 'lucide-react';
import type { ReactNode } from 'react';
import { getMe, logout } from '../api/endpoints';
import { UnauthorizedError } from '../api/client';
import { useResource } from '../data/useResource';
import { t } from '../i18n/t';
import { LoginScreen } from './LoginScreen';

interface AuthGateProps {
    children: (session: { email: string; logout: () => void }) => ReactNode;
}

export function AuthGate({ children }: AuthGateProps) {
    const me = useResource(getMe);
    if (me.error instanceof UnauthorizedError) return <LoginScreen />;
    if (me.error && !me.data)
        return (
            <main className="login">
                <p role="alert">{t('app.loadFailed', { error: me.error.message })}</p>
                <button type="button" onClick={() => void me.reload()}>
                    <RefreshCw aria-hidden="true" />
                    {t('app.retry')}
                </button>
            </main>
        );
    if (!me.data)
        return (
            <main className="login" aria-busy="true">
                <p>{t('app.loading')}</p>
            </main>
        );
    const onLogout = async () => {
        await logout().catch(() => undefined);
        window.location.assign('/');
    };
    return <>{children({ email: me.data.email, logout: () => void onLogout() })}</>;
}
