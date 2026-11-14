/*
 * 確認框一行：欄位名 + 「已發佈 / 目前」+ 剔格（最右欄，2026-11-14 用戶要求）（圖並排、字前後、配色色塊）；上下架行淨係「恢復上架」。
 * 冇剔 = 淡咗 + 虛線框（mockup admin-revert ② .diff-row.off）
 */
import { t } from '../../i18n/t';
import type { RevertRow } from './revertRows';
import type { RevertValue } from './revertValues';

function ValueView({ value, old }: { value: RevertValue; old: boolean }) {
    if (value.kind === 'image')
        return value.url ? (
            <span
                className={`img-box ${value.slot}`}
                style={{ backgroundImage: `url("${value.url}")` }}
            />
        ) : (
            <span className="txt-box old">{t('revert.noImage')}</span>
        );
    if (value.kind === 'theme')
        return (
            <span className="swatches">
                {value.colours.map((colour, i) => (
                    // 配色本身係資料（entry theme），唔係 admin token
                    <span key={i} className="swatch" style={{ background: colour }} />
                ))}
            </span>
        );
    return <span className={`txt-box${old ? ' old' : ''}`}>{value.text}</span>;
}

function Side({ caption, value, old }: { caption: string; value: RevertValue; old: boolean }) {
    return (
        <span className="diff-side">
            <span className="col-label">{caption}</span>
            <ValueView value={value} old={old} />
        </span>
    );
}

interface DiffRowProps {
    row: RevertRow;
    checked: boolean;
    onToggle: () => void;
}

export function DiffRow({ row, checked, onToggle }: DiffRowProps) {
    const classes = ['diff-row', row.values ? '' : 'single', checked ? '' : 'off'];
    return (
        <label className={classes.filter(Boolean).join(' ')}>
            <b>{row.label}</b>
            {row.values && (
                <>
                    <Side caption={t('revert.published')} value={row.values.published} old />
                    <Side caption={t('revert.current')} value={row.values.current} old={false} />
                </>
            )}
            <input
                type="checkbox"
                checked={checked}
                aria-label={t('revert.fieldLabel', { field: row.label })}
                onChange={onToggle}
            />
        </label>
    );
}
