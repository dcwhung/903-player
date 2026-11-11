/*
 * 側邊 nav：Design Origin: mockup: _mockups_/admin-style/index.html#a / #b（實色天藍 + 白字，可收細）
 * 結構：mockup: _mockups_/admin/index.html#uB（更新內容（待辦數）/ 內容：節目、廣播劇 / 記錄：上下架記錄 / who + 登出）
 * 收細（76px）：banner → 圓形「903」logo、只剩 icon + tooltip、待辦數 → 小橙點
 */
import { Disc, History, Inbox, Radio, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useAdminData } from '../data/AdminData';
import { t } from '../i18n/t';
import { Tooltip } from '../ui/Tooltip';
import { Brand } from './Brand';
import { NavFooter } from './NavFooter';

const UPDATE_PATHS = ['/', '/publish'];

export interface NavProps {
    email: string;
    onLogout: () => void;
    mini: boolean;
    onToggle: () => void;
}

interface ItemProps {
    to: string;
    label: string;
    icon: LucideIcon;
    mini: boolean;
    current?: boolean;
    ariaLabel?: string;
    extra?: ReactNode;
}

/** 一項 nav：收細時淨係 icon，aria-label + tooltip 講名 */
function Item({ to, label, icon: Icon, mini, current, ariaLabel, extra }: ItemProps) {
    const content = (
        <>
            <Icon aria-hidden="true" />
            <span className="label">{label}</span>
            {extra}
        </>
    );
    const name = ariaLabel ?? (mini ? label : undefined);
    return (
        <Tooltip text={label} side="right" enabled={mini}>
            {current === undefined ? (
                <NavLink to={to} aria-label={name}>
                    {content}
                </NavLink>
            ) : (
                <Link to={to} aria-current={current ? 'page' : undefined} aria-label={name}>
                    {content}
                </Link>
            )}
        </Tooltip>
    );
}

function BrandLink({ mini }: { mini: boolean }) {
    const label = `${t('app.name')} ${t('app.version', { version: __API_VERSION__ })}`;
    if (mini)
        return (
            <Link className="logo-mini" to="/" aria-label={label}>
                903
            </Link>
        );
    return (
        <Link className="brand-link" to="/">
            <Brand />
        </Link>
    );
}

function TodoBadge({ count, mini }: { count: number; mini: boolean }) {
    if (count === 0) return null;
    return mini ? (
        <span className="dot-count" aria-hidden="true" />
    ) : (
        <span className="pill count" aria-hidden="true">
            {count}
        </span>
    );
}

export function Nav(props: NavProps) {
    const { mini } = props;
    const { pathname } = useLocation();
    const blocking = useAdminData().todos.data?.blocking ?? 0;
    const todoLabel =
        blocking > 0
            ? `${t('nav.update')}（${t('nav.todoCount', { count: blocking })}）`
            : undefined;
    return (
        <nav className="nav" aria-label={t('nav.label')}>
            <BrandLink mini={mini} />
            <Item
                to="/"
                label={t('nav.update')}
                icon={Inbox}
                mini={mini}
                current={UPDATE_PATHS.includes(pathname)}
                ariaLabel={todoLabel}
                extra={<TodoBadge count={blocking} mini={mini} />}
            />
            <span className="group">{t('nav.content')}</span>
            <Item to="/shows" label={t('nav.shows')} icon={Radio} mini={mini} />
            <Item to="/dramas" label={t('nav.dramas')} icon={Disc} mini={mini} />
            <span className="group">{t('nav.records')}</span>
            <Item to="/history" label={t('nav.history')} icon={History} mini={mini} />
            <NavFooter {...props} />
        </nav>
    );
}
