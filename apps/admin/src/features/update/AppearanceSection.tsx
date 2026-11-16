/*
 * 更新頁「App 外觀」section：Design Origin: mockup: _mockups_/admin-selective-publish/index.html#a
 * 只列同上次發佈唔同嘅項目（GET /api/changes appearance）；全部冇改就成個 section 唔出。
 * 表頭「項目 · 狀態 · 發佈」，勾選欄最後；狀態跟 App 外觀頁 pill（草稿有自訂 = 自訂，冇 = 內建預設）
 */
import { getBanner } from '../../api/endpoints';
import { getBranding } from '../../api/brandingEndpoints';
import type { Appearance } from '../../api/types';
import { useResource } from '../../data/useResource';
import { t, type MessageKey } from '../../i18n/t';
import { Pill } from '../../ui/Pill';
import { APPEARANCE_LABEL, changedAppearance, type AppearanceItem } from './selectionModel';

const ITEM_META: Record<AppearanceItem, MessageKey> = {
    icon: 'update.metaRedeploy',
    text: 'update.metaRedeploy',
    banner: 'update.metaBanner',
};

type Custom = Record<AppearanceItem, boolean>;

const loadCustom = async (): Promise<Custom> => {
    const [branding, banner] = await Promise.all([getBranding(), getBanner()]);
    return { icon: branding.icon !== null, text: branding.text !== null, banner: !!banner.banner };
};

/* 同 App 外觀頁 StatusPill：自訂 = 綠，內建預設 = 灰；未讀到草稿 = 「未發佈」 */
function StatusPill({ custom }: { custom: boolean | undefined }) {
    if (custom === undefined) return <Pill>{t('update.statusPending')}</Pill>;
    if (!custom) return <Pill>{t('appearance.statusDefaultPending')}</Pill>;
    return <Pill tone="ok">{t('appearance.statusCustomPending')}</Pill>;
}

interface RowsProps {
    items: readonly AppearanceItem[];
    unpicked: ReadonlySet<AppearanceItem>;
    onToggle: (item: AppearanceItem) => void;
}

/** 有改動先讀草稿（狀態 pill 用） */
function AppearanceTable({ items, unpicked, onToggle }: RowsProps) {
    const custom = useResource(loadCustom);
    return (
        <section className="card flush table-wrap" aria-labelledby="todo-appearance-title">
            <h2 className="sec-title" id="todo-appearance-title">
                {t('update.appearanceTitle')}{' '}
                <span className="hint">{t('update.appearanceHint')}</span>
            </h2>
            <table className="matrix">
                <thead>
                    <tr>
                        <th scope="col">{t('update.colAppearanceItem')}</th>
                        <th scope="col">{t('update.colStatus')}</th>
                        <th scope="col" className="pick-col">
                            {t('update.colPublish')}
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {items.map((item) => (
                        <tr key={item}>
                            <th scope="row">
                                <b>{t(APPEARANCE_LABEL[item])}</b>
                                <span className="meta">{t(ITEM_META[item])}</span>
                            </th>
                            <td>
                                <StatusPill custom={custom.data?.[item]} />
                            </td>
                            <td className="pick-cell">
                                <label>
                                    <input
                                        type="checkbox"
                                        className="pick"
                                        checked={!unpicked.has(item)}
                                        onChange={() => onToggle(item)}
                                        aria-label={t('update.pickLabel', {
                                            name: t(APPEARANCE_LABEL[item]),
                                        })}
                                    />
                                </label>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </section>
    );
}

export function AppearanceSection({
    appearance,
    ...rows
}: Omit<RowsProps, 'items'> & { appearance: Appearance | undefined }) {
    const items = changedAppearance(appearance);
    return items.length > 0 ? <AppearanceTable items={items} {...rows} /> : null;
}
