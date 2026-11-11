/*
 * nav 底（mockup admin-style ⑨ nav v4）：
 * 主題（展開 = 三掣 segmented；收細 = 一粒輪住轉）+ 收合 icon 掣同一行，收合排最後（收細時排喺主題下面）；
 * 分隔線；最底 email 喺左、登出 icon 喺右（收細淨係登出）。icon 掣唔出字，有 aria-label + tooltip
 */
import { LogOut, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { t } from '../i18n/t';
import { Tooltip } from '../ui/Tooltip';
import type { NavProps } from './Nav';
import { ThemeSwitch } from './ThemeSwitch';

export function NavFooter({ email, onLogout, mini, onToggle }: NavProps) {
    const ToggleIcon = mini ? PanelLeftOpen : PanelLeftClose;
    const toggleLabel = mini ? t('nav.expandLabel') : t('nav.collapseLabel');
    return (
        <>
            <span className="spacer" />
            <div className="nav-tools">
                <ThemeSwitch mini={mini} />
                <Tooltip text={toggleLabel} side={mini ? 'right' : 'top'}>
                    <button
                        type="button"
                        className="icon-ghost nav-toggle"
                        data-flip="toggle"
                        aria-label={toggleLabel}
                        aria-expanded={!mini}
                        onClick={onToggle}
                    >
                        <ToggleIcon aria-hidden="true" />
                    </button>
                </Tooltip>
            </div>
            <div className="foot-row">
                {!mini && (
                    <span className="who" title={email}>
                        {email}
                    </span>
                )}
                <Tooltip text={t('nav.logout')} side={mini ? 'right' : 'top'}>
                    <button
                        type="button"
                        className="icon-ghost nav-logout"
                        aria-label={t('nav.logout')}
                        onClick={onLogout}
                    >
                        <LogOut aria-hidden="true" />
                    </button>
                </Tooltip>
            </div>
        </>
    );
}
