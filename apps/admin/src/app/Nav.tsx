/*
 * 側邊 nav（固定）：Design Origin: mockup: _mockups_/admin/index.html#uB（.nav）
 * 更新內容（待辦數）/ 內容：節目、廣播劇 / 記錄：上下架記錄 / who + 登出
 */
import { LogOut } from 'lucide-react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useAdminData } from '../data/AdminData';
import { t } from '../i18n/t';
import { Brand } from './Brand';

const UPDATE_PATHS = ['/', '/publish'];

interface NavProps {
    email: string;
    onLogout: () => void;
}

export function Nav({ email, onLogout }: NavProps) {
    const { pathname } = useLocation();
    const blocking = useAdminData().todos.data?.blocking ?? 0;
    const onUpdate = UPDATE_PATHS.includes(pathname);
    return (
        <nav className="nav" aria-label={t('nav.label')}>
            <Link className="brand-link" to="/">
                <Brand />
            </Link>
            <Link to="/" aria-current={onUpdate ? 'page' : undefined}>
                {t('nav.update')}
                {blocking > 0 && (
                    <span
                        className="pill count"
                        aria-label={t('nav.todoCount', { count: blocking })}
                    >
                        {blocking}
                    </span>
                )}
            </Link>
            <span className="group">{t('nav.content')}</span>
            <NavLink to="/shows">{t('nav.shows')}</NavLink>
            <NavLink to="/dramas">{t('nav.dramas')}</NavLink>
            <span className="group">{t('nav.records')}</span>
            <NavLink to="/history">{t('nav.history')}</NavLink>
            <span className="spacer" />
            <span className="who">{email}</span>
            <button type="button" className="nav-logout" onClick={onLogout}>
                <LogOut aria-hidden="true" />
                {t('nav.logout')}
            </button>
        </nav>
    );
}
