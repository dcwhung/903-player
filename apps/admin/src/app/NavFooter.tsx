/* nav 底：email + 登出 + 收合 / 展開（mockup admin-style ① / ② .collapse；收細時 icon + tooltip） */
import { LogOut, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { t } from '../i18n/t';
import { Tooltip } from '../ui/Tooltip';
import type { NavProps } from './Nav';
import { ThemeSwitch } from './ThemeSwitch';

export function NavFooter({ email, onLogout, mini, onToggle }: NavProps) {
    const ToggleIcon = mini ? PanelLeftOpen : PanelLeftClose;
    const toggleLabel = mini ? t('nav.expand') : t('nav.collapse');
    return (
        <>
            <span className="spacer" />
            <span className="who">{email}</span>
            <Tooltip text={t('nav.logout')} side="right" enabled={mini}>
                <button
                    type="button"
                    className="nav-btn nav-logout"
                    aria-label={mini ? t('nav.logout') : undefined}
                    onClick={onLogout}
                >
                    <LogOut aria-hidden="true" />
                    <span className="label">{t('nav.logout')}</span>
                </button>
            </Tooltip>
            <ThemeSwitch mini={mini} />
            <Tooltip text={toggleLabel} side="right" enabled={mini}>
                <button
                    type="button"
                    className="nav-btn nav-collapse"
                    aria-label={mini ? t('nav.expandLabel') : t('nav.collapseLabel')}
                    aria-expanded={!mini}
                    onClick={onToggle}
                >
                    <ToggleIcon aria-hidden="true" />
                    <span className="label">{toggleLabel}</span>
                </button>
            </Tooltip>
        </>
    );
}
