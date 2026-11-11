/* 預覽：label / value 兩欄，「：」後文字對齊（mockup ⑦ dl.kv） */
import { formatAirTime } from '@903-player/catalog';
import type { RawDefinition } from '../../api/types';
import { t } from '../../i18n/t';
import { nameOf } from '../../model/raw';
import { airDaysOf, airTimeOf, hostsOf, summaryOf } from './showModel';

export function ShowPreview({ definition }: { definition: RawDefinition }) {
    const hosts = hostsOf(definition);
    return (
        <div className="preview" aria-label={t('show.preview')} role="region">
            <p className="muted small">{t('show.preview')}</p>
            <p>
                <b>{nameOf(definition, '')}</b>
            </p>
            <dl className="kv">
                {summaryOf(definition) && (
                    <>
                        <dt>{t('fields.summary')}</dt>
                        <dd>{summaryOf(definition)}</dd>
                    </>
                )}
                <dt>{t('show.airTime')}</dt>
                <dd>{formatAirTime(airDaysOf(definition), airTimeOf(definition))}</dd>
                {hosts.length > 0 && (
                    <>
                        <dt>{t('show.hosts')}</dt>
                        <dd>{hosts.join('、')}</dd>
                    </>
                )}
            </dl>
        </div>
    );
}
