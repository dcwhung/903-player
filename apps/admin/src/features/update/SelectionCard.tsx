/*
 * 確認發佈頁「本次發佈」：Design Origin: mockup: _mockups_/admin-publish-summary/index.html（B v2）
 * 淨留 App 外觀 chip + 未完成項目（不會在本次發佈）+ App 外觀（圖示 / 名稱與簡介）須重新部署提示；
 * 逐項內容（新內容 / 其他已儲存的改動）只喺時間線列。乜都冇就成張卡唔顯示
 */
import { RefreshCw, TriangleAlert } from 'lucide-react';
import type { ChangesResponse, PublishSelection, TodoRow } from '../../api/types';
import { t } from '../../i18n/t';
import { displayName, incompleteText } from './todoModel';
import { APPEARANCE_LABEL, publishedAppearance } from './selectionModel';

/** 未完成：待辦嘅 incomplete 行 + server 自動剔走嘅（揀咗之後先變未完成） */
const incompleteOf = (rows: readonly TodoRow[], data: ChangesResponse): TodoRow[] => {
    const skipped = new Set(data.selection?.skipped.map((s) => s.key));
    return rows.filter((row) => row.publish === 'incomplete' || skipped.has(row.key));
};

interface SelectionCardProps {
    data: ChangesResponse;
    selection: PublishSelection;
    rows: readonly TodoRow[];
}

export function SelectionCard({ data, selection, rows }: SelectionCardProps) {
    const appearance = publishedAppearance(data, selection);
    const incomplete = incompleteOf(rows, data);
    const redeploy = data.brandingChanged === true;
    if (appearance.length === 0 && incomplete.length === 0 && !redeploy) return null;
    return (
        <section className="card" aria-labelledby="publish-selection-title">
            <h2 className="sec-title" id="publish-selection-title">
                {t('publish.selectionTitle')}
            </h2>
            {appearance.length > 0 && (
                <div className="pub-looks">
                    {appearance.map((item) => (
                        <span key={item} className="pub-look">
                            {t('publish.selectionAppearance', { name: t(APPEARANCE_LABEL[item]) })}
                        </span>
                    ))}
                </div>
            )}
            {incomplete.length > 0 && (
                <p className="note muted-note">
                    <TriangleAlert aria-hidden="true" />
                    {t('publish.incomplete', {
                        items: incomplete
                            .map((row) => incompleteText(displayName(row), row))
                            .join('；'),
                    })}
                </p>
            )}
            {redeploy && (
                <p className="note info" role="note">
                    <RefreshCw aria-hidden="true" />
                    {t('publish.deployNote')}
                </p>
            )}
        </section>
    );
}
