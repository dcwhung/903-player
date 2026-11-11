/*
 * 淺 / 深色切換（nav footer，「收合」上面）：展開 = 三粒 icon（跟系統 / 淺色 / 深色）segmented；
 * 收細 = 一粒掣，撳一下輪住轉。每粒都有 aria-label + tooltip
 */
import { Monitor, Moon, Sun, type LucideIcon } from 'lucide-react';
import { t, type MessageKey } from '../i18n/t';
import { Tooltip } from '../ui/Tooltip';
import { nextTheme, useThemePref, type ThemePref } from './themePref';

const OPTIONS: readonly { pref: ThemePref; icon: LucideIcon; label: MessageKey }[] = [
    { pref: 'system', icon: Monitor, label: 'theme.system' },
    { pref: 'light', icon: Sun, label: 'theme.light' },
    { pref: 'dark', icon: Moon, label: 'theme.dark' },
];

const optionOf = (pref: ThemePref) => OPTIONS.find((o) => o.pref === pref) ?? OPTIONS[0];

function CycleButton({ pref, onChoose }: { pref: ThemePref; onChoose: (p: ThemePref) => void }) {
    const current = optionOf(pref);
    const Icon = current?.icon ?? Monitor;
    const label = t('theme.cycle', {
        current: t(current?.label ?? 'theme.system'),
        next: t(optionOf(nextTheme(pref))?.label ?? 'theme.system'),
    });
    return (
        <Tooltip text={label} side="right">
            <button
                type="button"
                className="nav-btn theme-cycle"
                aria-label={label}
                onClick={() => onChoose(nextTheme(pref))}
            >
                <Icon aria-hidden="true" />
            </button>
        </Tooltip>
    );
}

export function ThemeSwitch({ mini }: { mini: boolean }) {
    const { pref, choose } = useThemePref();
    if (mini) return <CycleButton pref={pref} onChoose={choose} />;
    return (
        <div className="theme-switch" role="group" aria-label={t('theme.label')}>
            {OPTIONS.map(({ pref: value, icon: Icon, label }) => (
                <Tooltip key={value} text={t(label)}>
                    <button
                        type="button"
                        aria-label={t(label)}
                        aria-pressed={pref === value}
                        onClick={() => choose(value)}
                    >
                        <Icon aria-hidden="true" />
                    </button>
                </Tooltip>
            ))}
        </div>
    );
}
