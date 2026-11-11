/*
 * App shell：Design Origin: mockup: _mockups_/admin-style/index.html#a / #b（.shell / .shell.mini）
 * 結構：mockup: _mockups_/admin/index.html#uB。nav 固定（可收細）、內容 panel 四角圓角自己 scroll（100dvh）；
 * 頂部自動掃描 bar
 */
import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useAdminData } from '../data/AdminData';
import { ScanBar } from '../features/update/ScanBar';
import { Nav } from './Nav';
import { useNavCollapse } from './navCollapse';

interface AppShellProps {
    email: string;
    onLogout: () => void;
    children: ReactNode;
}

export function AppShell({ email, onLogout, children }: AppShellProps) {
    const { scan, rescan, todos } = useAdminData();
    const { pathname } = useLocation();
    const nav = useNavCollapse();
    return (
        <div className={`shell${nav.mini ? ' mini' : ''}`}>
            <Nav email={email} onLogout={onLogout} mini={nav.mini} onToggle={nav.toggle} />
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
