/*
 * 確認發佈時間線嘅卡（B v2）：Design Origin: mockup: _mockups_/admin-publish-summary/index.html
 * 劇 / 節目卡：卡頭碟面 + 名，下面縮排逐行「[類型] 劇集 / [類型] 短篇碟面 短篇名」+ 欄位 chip / 集數；
 * App 外觀卡：「[App 外觀] 名稱與簡介」+ 圖示 / 名稱與簡介要重新部署
 */
import type { ChangeItem } from '@903-player/catalog';
import { AppWindow, GalleryHorizontal, Type, type LucideIcon } from 'lucide-react';
import { entryReverter } from '../../api/revertEndpoints';
import type { LoadedEntry } from '../../api/types';
import { t } from '../../i18n/t';
import { entryDiscOf, thumbOf } from '../../model/thumbs';
import { Thumb } from '../../ui/Thumb';
import { RevertButton } from '../revert/RevertButton';
import { RevertFlow } from '../revert/RevertFlow';
import { timelineRevertOf } from '../revert/revertRows';
import { editFieldChips } from './changeFields';
import { APPEARANCE_LABEL, type AppearanceItem } from './selectionModel';
import { cardRows, rowExtra, rowLevel, toneOf, type EntryCard } from './timelineEntries';
import { itemName, kindLabel } from './timelineModel';

interface WithEntries {
    entries: readonly LoadedEntry[];
    /** 有 = 修改 / 下架行最右出「還原」（mockup admin-revert ①）；還原完 caller 重讀 */
    onReverted?: (() => Promise<unknown>) | undefined;
}

/** 行尾「還原」+ 確認框；新內容 / 冇發佈版本 = 冇 */
function RowRevert({ item, entries, onReverted }: { item: ChangeItem } & WithEntries) {
    const target = onReverted ? timelineRevertOf(item, entries) : null;
    if (!target || !onReverted) return null;
    return (
        <RevertFlow
            perform={entryReverter(target.entry)}
            name={target.name}
            rows={target.rows}
            onDone={onReverted}
            trigger={(open) => (
                <RevertButton
                    label={t('revert.buttonLabel', { name: target.name })}
                    onClick={open}
                />
            )}
        />
    );
}

function Row({ item, entries, onReverted }: { item: ChangeItem } & WithEntries) {
    const level = rowLevel(item);
    const extra = rowExtra(item, entries);
    return (
        <li className="tl-row">
            <span className={`tl-tag ${toneOf(item.kind)}`}>{kindLabel(item.kind)}</span>
            {level && <span className="muted">{level}</span>}
            {item.arc && (
                <>
                    <Thumb url={thumbOf(entries, item)} size="sm" />
                    <span className="tl-arc">{item.arc.label}</span>
                </>
            )}
            {editFieldChips(item, entries).map((chip) => (
                <span key={chip} className="tl-chip">
                    {chip}
                </span>
            ))}
            {extra && <span className="muted small">{extra}</span>}
            <RowRevert item={item} entries={entries} onReverted={onReverted} />
        </li>
    );
}

const rowKey = (item: ChangeItem, index: number) => `${item.kind}-${item.arc?.id ?? ''}-${index}`;

export function EntryCardView({ card, entries, onReverted }: { card: EntryCard } & WithEntries) {
    const rows = cardRows(card);
    const first = card.items[0];
    return (
        // data-revert-anchor：還原完嗰行冇咗，focus 返呢張卡（S-1007，revertFocus.ts）
        <li className="tl-entry" data-revert-anchor={card.key}>
            <div className="tl-entry-head">
                <Thumb url={card.entry && entryDiscOf(entries, card.entry)} />
                <span className="tl-entry-title">
                    {card.entry?.name ?? (first && itemName(first))}
                </span>
            </div>
            <ul className="tl-rows">
                {rows.map((item, i) => (
                    <Row
                        key={rowKey(item, i)}
                        item={item}
                        entries={entries}
                        onReverted={onReverted}
                    />
                ))}
            </ul>
        </li>
    );
}

const APPEARANCE_ICON: Readonly<Record<AppearanceItem, LucideIcon>> = {
    icon: AppWindow,
    text: Type,
    banner: GalleryHorizontal,
};

/** 圖示 / 名稱與簡介要等重新部署播放器；Banner 即時 */
const REDEPLOYED: ReadonlySet<AppearanceItem> = new Set(['icon', 'text']);

export function AppearanceCard({ item }: { item: AppearanceItem }) {
    const Icon = APPEARANCE_ICON[item];
    return (
        <li className="tl-entry">
            <div className="tl-entry-head">
                <span className="tl-app-icon">
                    <Icon aria-hidden="true" />
                </span>
                <div className="tl-head-text">
                    <span className="tl-line">
                        <span className="tl-tag look">{t('publish.appearanceTag')}</span>
                        <span className="tl-entry-title">{t(APPEARANCE_LABEL[item])}</span>
                    </span>
                    {REDEPLOYED.has(item) && (
                        <span className="muted small">{t('publish.appearanceDeploy')}</span>
                    )}
                </div>
            </div>
        </li>
    );
}
