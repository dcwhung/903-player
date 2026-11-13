/*
 * 更新頁底：「已選擇 N 項發佈 · M 項未完成（不會發佈）」+「下一步：確認發佈」
 * （mockup: _mockups_/admin-selective-publish/index.html#a .foot）。必須處理唔再擋；
 * Q4：冇揀任何新內容 / App 外觀、又冇其他改動 → 灰 +「未選擇任何內容」；
 * GET /api/changes 未載入完（App 外觀未知）→ 灰 +「載入中…」（S-987：否則預設勾咗嘅 App 外觀會靜靜雞唔發佈）
 * GET /api/changes 載入失敗 → 灰 +「載入失敗：…」（S-988：唔好永遠停喺「載入中…」）
 */
import type { ChangeItem } from '@903-player/catalog';
import { Send } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { PublishSelection } from '../../api/types';
import { t } from '../../i18n/t';
import { encodeSelection, hasAnythingToPublish, pickedCount } from './selectionModel';

interface SelectionFooterProps {
    selection: PublishSelection;
    incomplete: number;
    /** 其他已儲存改動（GET /api/changes others.items，Q3） */
    others: readonly ChangeItem[];
    /** GET /api/changes 未有資料 */
    loading: boolean;
    /** GET /api/changes 載入失敗嘅訊息（S-988） */
    error?: string;
}

const summaryOf = ({
    selection,
    incomplete,
    others,
    loading,
    error,
}: SelectionFooterProps): string => {
    if (error !== undefined) return t('app.loadFailed', { error });
    if (loading) return t('app.loading');
    const picked = pickedCount(selection);
    if (!hasAnythingToPublish(selection, others)) return t('update.nothingPicked');
    const head = picked > 0 ? t('update.picked', { count: picked }) : t('update.othersOnly');
    return incomplete > 0
        ? `${head} · ${t('update.incompleteCount', { count: incomplete })}`
        : head;
};

export function SelectionFooter(props: SelectionFooterProps) {
    const navigate = useNavigate();
    const canGo =
        props.error === undefined &&
        !props.loading &&
        hasAnythingToPublish(props.selection, props.others);
    return (
        <div className="savebar">
            <span className="muted small" aria-live="polite">
                {summaryOf(props)}
            </span>
            <div className="actions">
                <button
                    type="button"
                    className="primary big"
                    disabled={!canGo}
                    onClick={() => navigate(`/publish?${encodeSelection(props.selection)}`)}
                >
                    <Send aria-hidden="true" />
                    {t('update.next')}
                </button>
            </div>
        </div>
    );
}
