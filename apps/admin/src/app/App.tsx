/* Admin SPA 入口：直向提示（CSS 切換）+ login 守門 + 共用資料 + 路由 */
import { AdminDataProvider } from '../data/AdminData';
import { PublishSelectionProvider } from '../features/update/PublishSelection';
import { ToastProvider } from '../ui/Toast';
import { AppRoutes } from './AppRoutes';
import { AppShell } from './AppShell';
import { AuthGate } from './AuthGate';
import { RotateNotice } from './RotateNotice';

export function App() {
    return (
        <>
            <RotateNotice />
            <div className="app-root">
                <AuthGate>
                    {({ email, logout }) => (
                        <ToastProvider>
                            <AdminDataProvider>
                                <PublishSelectionProvider>
                                    <AppShell email={email} onLogout={logout}>
                                        <AppRoutes />
                                    </AppShell>
                                </PublishSelectionProvider>
                            </AdminDataProvider>
                        </ToastProvider>
                    )}
                </AuthGate>
            </div>
        </>
    );
}
