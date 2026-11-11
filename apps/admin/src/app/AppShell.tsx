/*
 * App shell：Design Origin: mockup: _mockups_/admin/index.html#uB（.shell）
 * nav 固定、內容區自己 scroll（100dvh）；頂部自動掃描 bar
 */
import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useAdminData } from '../data/AdminData';
import { ScanBar } from '../features/update/ScanBar';
import { Nav } from './Nav';

interface AppShellProps {
    email: string;
    onLogout: () => void;
    children: ReactNode;
}

export function AppShell({ email, onLogout, children }: AppShellProps) {
    const { scan, rescan, todos } = useAdminData();
    const { pathname } = useLocation();
    return (
        <div className="shell">
            <Nav email={email} onLogout={onLogout} />
            <main className="content">
                <div className="main">
                    <ScanBar
                        scan={scan}
                        rows={todos.data?.rows}
                        onRescan={() => void rescan()}
                        onTodosPage={pathname === '/'}
                    />
                    {children}
                </div>
            </main>
        </div>
    );
}
