/*
 * 配色（節目 + 劇集）：Design Origin: mockup: _mockups_/admin-phase4/index.html#d
 * 「現用」+ 碟面抽色出嘅三套候選（細版 player preview + AA / ⚠）；「更換另外三套」輪下一組（九套，輪完由頭）；
 * 揀候選撳「套用」→ onApply（caller 即刻儲存）。冇 picker、冇深淺掣、冇對比度表（用戶 2026-11-12）。
 * 新劇（10 色 = NEUTRAL_THEME）：現用標「未設定」、第一套候選標「建議」，唔自動套用
 */
import { Check, RefreshCw } from 'lucide-react';
import { useId } from 'react';
import { t } from '../../i18n/t';
import { isNeutralTheme, type EntryTheme } from '../../model/theme';
import { Pill } from '../../ui/Pill';
import { ThemeCard } from './ThemeCard';
import { useThemeCandidates } from './useThemeCandidates';
import { labelOf, useThemePicker } from './useThemePicker';

export interface ThemeEditorProps {
    name: string;
    /** 細版 player 頁頭副標題（「廣播劇 · 18 集」/「節目」） */
    sub: string;
    discUrl: string | undefined;
    current: EntryTheme;
    /** 儲存新配色；false = 儲存失敗（錯誤由編輯頁顯示） */
    onApply: (theme: EntryTheme) => Promise<boolean>;
}

function StatusNote({ status, error }: { status: string; error?: string }) {
    if (status === 'noDisc') return <p className="muted">{t('themeEditor.noDisc')}</p>;
    if (status === 'error')
        return <p className="note bad">{t('themeEditor.failed', { error: error ?? '' })}</p>;
    return status === 'loading' ? <p className="muted">{t('themeEditor.loading')}</p> : null;
}

type Picker = ReturnType<typeof useThemePicker>;

function ThemeHead({
    headId,
    name,
    picker,
    empty,
}: {
    headId: string;
    name: string;
    picker: Picker;
    empty: boolean;
}) {
    return (
        <div className="theme-head">
            <h3 id={headId}>{t('themeEditor.title', { name })}</h3>
            <span className="small muted">
                {t('themeEditor.round', { round: picker.round + 1, count: picker.rounds })}
            </span>
            <button type="button" disabled={empty} onClick={picker.more}>
                <RefreshCw aria-hidden="true" />
                {t('themeEditor.more')}
            </button>
        </div>
    );
}

function CandidateGrid({
    picker,
    current,
    player,
}: {
    picker: Picker;
    current: EntryTheme;
    player: Pick<ThemeEditorProps, 'name' | 'sub' | 'discUrl'>;
}) {
    const unset = isNeutralTheme(current);
    return (
        <div className="tgrid" role="group" aria-label={t('themeEditor.candidatesLabel')}>
            <ThemeCard
                label={t(unset ? 'themeEditor.currentUnset' : 'themeEditor.current')}
                badge={unset && <Pill tone="warn">{t('themeEditor.unset')}</Pill>}
                theme={current}
                pressed={picker.selected === 0}
                onPick={() => picker.setSelected(0)}
                {...player}
            />
            {picker.shown.map((candidate, i) => (
                <ThemeCard
                    key={candidate.label}
                    label={labelOf(candidate)}
                    badge={unset && i === 0 && <Pill tone="info">{t('themeEditor.suggest')}</Pill>}
                    theme={candidate.theme}
                    pressed={picker.selected === i + 1}
                    onPick={() => picker.setSelected(i + 1)}
                    {...player}
                />
            ))}
        </div>
    );
}

export function ThemeEditor({ name, sub, discUrl, current, onApply }: ThemeEditorProps) {
    const headId = useId();
    const candidates = useThemeCandidates(discUrl);
    const pool = candidates.status === 'ready' ? candidates.pool : [];
    const picker = useThemePicker(pool, current, onApply);
    return (
        <section className="card theme-card" aria-labelledby={headId}>
            <ThemeHead headId={headId} name={name} picker={picker} empty={pool.length === 0} />
            <StatusNote
                status={candidates.status}
                error={candidates.status === 'error' ? candidates.error : undefined}
            />
            <CandidateGrid picker={picker} current={current} player={{ name, sub, discUrl }} />
            <div className="theme-foot">
                <span className="small" role="status">
                    {picker.note}
                </span>
                <button
                    type="button"
                    className="primary"
                    disabled={picker.selected === 0 || picker.saving}
                    onClick={() => void picker.apply()}
                >
                    <Check aria-hidden="true" />
                    {picker.saving ? t('themeEditor.applying') : t('themeEditor.apply')}
                </button>
            </div>
        </section>
    );
}
