/*
 * 確認發佈頁頂：統計卡 + 驗證 ✓ pill（hover 睇數字）+ 驗證錯誤 + 配色警告
 * （mockup: _mockups_/admin/index.html#u3、_mockups_/admin-phase4/index.html#f）；數字跟今次選擇（api 0.10.0）。
 * 數量 pill 已拎走（mockup: _mockups_/admin-publish-summary/index.html 方案 1，數字卡已講晒）
 */
import { CirclePlus, EyeOff, ListPlus, PencilLine } from 'lucide-react';
import type { ChangesResponse, LoadedEntry, Validation } from '../../api/types';
import { t } from '../../i18n/t';
import { Pill } from '../../ui/Pill';
import { StatCards, type Stat } from '../../ui/StatCards';
import { PublishError } from './PublishError';
import { PublishWarnings } from './PublishWarnings';
import { publishStats } from './timelineModel';

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

export function PublishHead({ data, entries }: { data: ChangesResponse; entries: LoadedEntry[] }) {
    return (
        <>
            {data.changes.items.length > 0 && (
                <StatCards stats={statsOf(data)} label={t('publish.statsLabel')} />
            )}
            <div className="pub-head">
                <ValidationPill validation={data.validation} />
            </div>
            {!data.validation.ok && <PublishError error={data.validation.error} />}
            <PublishWarnings
                warnings={data.warnings ?? []}
                entries={entries}
                forceOpen={!data.validation.ok}
            />
        </>
    );
}
