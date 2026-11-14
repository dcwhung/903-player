/*
 * 排序改動卡（#6 決定 A）：成個列表一張卡「[修改] 節目排序已更改」+「還原」，排喺即時上線組最頂（還原記錄之後）。
 * 「還原」→ 同其他行一樣嘅確認框（一項「排序」，預設剔）→ POST /api/order/:kind/revert → 重讀。
 * 卡頭用 App 外觀卡嘅方格 icon（冇 entry、冇碟面）；冇發佈剔格（同其他已儲存改動一樣，一定會發佈）
 */
import type { CatalogKind, ChangeItem } from '@903-player/catalog';
import { ArrowUpDown } from 'lucide-react';
import { revertOrder } from '../../api/revertEndpoints';
import { t } from '../../i18n/t';
import { RevertButton } from '../revert/RevertButton';
import { RevertFlow } from '../revert/RevertFlow';
import type { RevertRow } from '../revert/revertRows';
import { reorderKeyOf, toneOf } from './timelineEntries';
import { kindLabel, listName, reorderTitle } from './timelineModel';

const ORDER_FIELD = 'order';

/** 確認框嗰一項：「節目排序」/「廣播劇排序」（冇前後值，同「恢復上架」一樣一行；用戶 2026-11-14 要寫明邊個列表） */
const orderName = (list: CatalogKind): string => t('revert.orderName', { list: listName(list) });

const orderRows = (list: CatalogKind): readonly RevertRow[] => [
    { key: ORDER_FIELD, item: { field: ORDER_FIELD }, label: orderName(list) },
];

interface ReorderCardProps {
    item: ChangeItem;
    /** 有 = 出「還原」；還原完 caller 重讀 */
    onReverted?: (() => Promise<unknown>) | undefined;
}

function ReorderRevert({
    list,
    onReverted,
}: {
    list: CatalogKind;
    onReverted: () => Promise<unknown>;
}) {
    return (
        <RevertFlow
            perform={() => revertOrder(list)}
            name={orderName(list)}
            rows={orderRows(list)}
            onDone={onReverted}
            trigger={(open) => (
                <RevertButton
                    label={t('revert.orderLabel', { list: listName(list) })}
                    onClick={open}
                />
            )}
        />
    );
}

export function ReorderCard({ item, onReverted }: ReorderCardProps) {
    const list = item.detail.list ?? 'shows';
    return (
        <li className="tl-entry" data-revert-anchor={reorderKeyOf(list)}>
            <div className="tl-entry-head">
                <span className="tl-app-icon">
                    <ArrowUpDown aria-hidden="true" />
                </span>
                <span className="tl-line">
                    <span className={`tl-tag ${toneOf(item.kind)}`}>{kindLabel(item.kind)}</span>
                    <span className="tl-entry-title">{reorderTitle(item)}</span>
                </span>
                {onReverted && <ReorderRevert list={list} onReverted={onReverted} />}
            </div>
        </li>
    );
}
