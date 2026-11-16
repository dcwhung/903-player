/*
 * 配色候選嘅揀選狀態：第幾組（每組三套，輪完由頭）、揀咗邊張（0 = 現用）、套用中 / 套用完提示
 */
import { useState } from 'react';
import { t } from '../../i18n/t';
import type { EntryTheme } from '../../model/theme';
import { CANDIDATES_PER_ROUND, toEntryTheme, type ThemeCandidate } from './palette';

export const labelOf = (candidate: ThemeCandidate) => t(`themeEditor.labels.${candidate.label}`);

export const useThemePicker = (
    pool: ThemeCandidate[],
    current: EntryTheme,
    onApply: (theme: EntryTheme) => Promise<boolean>,
) => {
    const [round, setRound] = useState(0);
    const [selected, setSelected] = useState(0);
    const [note, setNote] = useState('');
    const [saving, setSaving] = useState(false);
    const rounds = Math.max(1, Math.ceil(pool.length / CANDIDATES_PER_ROUND));
    const shown = pool.slice(round * CANDIDATES_PER_ROUND, (round + 1) * CANDIDATES_PER_ROUND);
    const more = () => {
        setRound((round + 1) % rounds);
        setSelected(0);
    };
    const apply = async () => {
        const picked = shown[selected - 1];
        if (!picked) return;
        setSaving(true);
        const saved = await onApply(toEntryTheme(picked.theme, current));
        setSaving(false);
        if (!saved) return;
        setSelected(0);
        setNote(t('themeEditor.applied', { label: labelOf(picked) }));
    };
    return { round, rounds, shown, selected, setSelected, note, saving, more, apply };
};
