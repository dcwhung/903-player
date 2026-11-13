/*
 * 側邊 nav：Design Origin: mockup: _mockups_/admin-style/index.html#i（⑨ / ⑨b nav v4，實色天藍 + 白字，可收細）
 * 品牌：App 外觀（最頂）/ 內容：更新（待辦數）、節目、廣播劇 / 記錄：發佈 / 部署記錄 / 底：主題 + 收合、email + 登出（NavFooter）
 * 收細（76px）：banner → player app icon 縮圖（public/icon-192.png，圓角）、只剩 icon + tooltip、待辦數 → 小橙點。
 * 手動收合 / 展開：主題掣同收合掣由舊位置滑去新位置（FLIP，flip.ts）；視窗窄咗自動收合唔播
 */
import { Disc, History, Image, Inbox, Radio, type LucideIcon } from 'lucide-react';
import { useRef, type ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useAdminData } from '../data/AdminData';
import { t } from '../i18n/t';
import { Tooltip } from '../ui/Tooltip';
import { Brand } from './Brand';
import { useFlip } from './flip';
import { NavFooter } from './NavFooter';

const UPDATE_PATHS = ['/', '/publish'];
/** player 嘅 app icon（複製咗一份喺 admin public/） */
const APP_ICON_PATH = '/icon-192.png';

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
            <Link className="logo-mini" to="/">
                <img src={APP_ICON_PATH} alt={label} width={48} height={48} />
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
    const { mini, onToggle } = props;
    const { pathname } = useLocation();
    const navRef = useRef<HTMLElement>(null);
    const capture = useFlip(navRef, mini);
    const blocking = useAdminData().todos.data?.blocking ?? 0;
    const todoLabel =
        blocking > 0
            ? `${t('nav.update')}（${t('nav.todoCount', { count: blocking })}）`
            : undefined;
    const toggle = () => {
        capture();
        onToggle();
    };
    return (
        <nav ref={navRef} className="nav" aria-label={t('nav.label')}>
            <BrandLink mini={mini} />
            <span className="group">{t('nav.brand')}</span>
            <Item to="/appearance" label={t('nav.appearance')} icon={Image} mini={mini} />
            <span className="group">{t('nav.content')}</span>
            <Item
                to="/"
                label={t('nav.update')}
                icon={Inbox}
                mini={mini}
                current={UPDATE_PATHS.includes(pathname)}
                ariaLabel={todoLabel}
                extra={<TodoBadge count={blocking} mini={mini} />}
            />
            <Item to="/shows" label={t('nav.shows')} icon={Radio} mini={mini} />
            <Item to="/dramas" label={t('nav.dramas')} icon={Disc} mini={mini} />
            <span className="group">{t('nav.records')}</span>
            <Item to="/history" label={t('nav.history')} icon={History} mini={mini} />
            <NavFooter {...props} onToggle={toggle} />
        </nav>
    );
}
