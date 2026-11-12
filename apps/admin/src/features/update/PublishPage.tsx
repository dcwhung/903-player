/*
 * 更新 · 確認發佈：Design Origin: mockup: _mockups_/admin/index.html#u3（結構）+
 * mockup: _mockups_/admin-style/index.html#a（漸變統計卡）。
 * 統計卡 + 數量 pill + 驗證 ✓ pill（hover 睇數字）+ 時間線 + 大「發佈」掣；409 → 擋住清單（#s9）
 * Phase 4（mockup: _mockups_/admin-phase4/index.html#f）：配色警告（PublishWarnings）、首頁 Banner 改咗都算有變更
 */
import { CirclePlus, EyeOff, ListPlus, PencilLine } from 'lucide-react';
import { useEffect } from 'react';
import type { ChangesResponse, LoadedEntry, Validation } from '../../api/types';
import { useAdminData } from '../../data/AdminData';
import { t } from '../../i18n/t';
import { Pill } from '../../ui/Pill';
import { PublishActions } from './PublishActions';
import { PublishWarnings } from './PublishWarnings';
import { Stepper } from './Stepper';
import { Timeline } from './Timeline';
import { StatCards, type Stat } from '../../ui/StatCards';
import { countPills, publishStats } from './timelineModel';
import { usePublish } from './usePublish';

function ValidationPill({ validation }: { validation: Validation }) {
    if (validation.ok)
        return (
            <Pill tone="ok" title={t('publish.validTitle', { count: validation.episodeCount })}>
                {t('publish.validOk')}
            </Pill>
        );
    return (
        <Pill tone="bad" title={validation.error}>
            {t('publish.validBad')}
        </Pill>
    );
}

const statsOf = (data: ChangesResponse): Stat[] => {
    const counts = publishStats(data.changes);
    return [
        {
            key: 'added',
            tone: 'sky',
            icon: CirclePlus,
            value: counts.added,
            label: t('publish.statNew'),
        },
        {
            key: 'episodes',
            tone: 'green',
            icon: ListPlus,
            value: counts.episodes,
            label: t('publish.statEpisodes'),
        },
        {
            key: 'edits',
            tone: 'orange',
            icon: PencilLine,
            value: counts.edits,
            label: t('publish.statEdits'),
        },
        {
            key: 'unlists',
            tone: 'red',
            icon: EyeOff,
            value: counts.unlists,
            label: t('publish.statUnlists'),
        },
    ];
};

function PublishHead({ data, entries }: { data: ChangesResponse; entries: LoadedEntry[] }) {
    return (
        <>
            {data.changes.items.length > 0 && (
                <StatCards stats={statsOf(data)} label={t('publish.statsLabel')} />
            )}
            <div className="pub-head">
                <div className="pills">
                    {countPills(data.changes).map((pill) => (
                        <Pill key={pill.kind} tone="ok">
                            {pill.label}
                        </Pill>
                    ))}
                    {data.bannerChanged && <Pill tone="ok">{t('publish.bannerChanged')}</Pill>}
                </div>
                <ValidationPill validation={data.validation} />
            </div>
            {!data.validation.ok && <p className="note bad">{data.validation.error}</p>}
            <PublishWarnings
                warnings={data.warnings ?? []}
                entries={entries}
                forceOpen={!data.validation.ok}
            />
        </>
    );
}

const emptyText = (loading: boolean, bannerChanged: boolean) => {
    if (loading) return t('app.loading');
    return t(bannerChanged ? 'publish.bannerOnly' : 'publish.nothing');
};

export function PublishPage() {
    const { changes, entries } = useAdminData();
    const { state, run } = usePublish();
    const { reload } = changes;
    useEffect(() => void reload(), [reload]);
    const data = changes.data;
    // 首頁 Banner（草稿）改咗都算有嘢發佈
    const hasChanges = (data?.changes.items.length ?? 0) > 0 || data?.bannerChanged === true;
    const canPublish = data?.validation.ok === true && hasChanges;
    return (
        <>
            <div className="title-row">
                <h1>{t('update.title')}</h1>
            </div>
            <Stepper current={3} />
            {data && <PublishHead data={data} entries={entries.data ?? []} />}
            <div className="card">
                {data && data.changes.timeline.length > 0 ? (
                    <Timeline groups={data.changes.timeline} entries={entries.data ?? []} />
                ) : (
                    <p className="muted">
                        {emptyText(changes.loading, data?.bannerChanged === true)}
                    </p>
                )}
            </div>
            <PublishActions state={state} canPublish={canPublish} onPublish={() => void run()} />
        </>
    );
}
