/*
 * 播放時間（3c）：「設定播放時間」checkbox。冇剔 = 唔顯示時間框、definition 唔寫 airTime；
 * 剔咗 = roller（mockup admin #s3，由預設或者啱啱剔走前嘅時間開始）
 */
import { useState } from 'react';
import type { RawDefinition } from '../../api/types';
import { t } from '../../i18n/t';
import { Tip } from '../../ui/Tip';
import { TimeRoller, type TimeRange } from '../../ui/TimeRoller';
import { DEFAULT_AIR_TIME, airTimeOf } from './showModel';

interface AirTimeFieldProps {
    definition: RawDefinition;
    /** value = '' 即係刪走欄位（withOptional） */
    set: (key: string, value: unknown) => void;
}

export function AirTimeField({ definition, set }: AirTimeFieldProps) {
    const airTime = airTimeOf(definition);
    const [last, setLast] = useState<TimeRange>(airTime ?? DEFAULT_AIR_TIME);
    const onTick = (checked: boolean) => {
        if (!checked && airTime) setLast(airTime);
        set('airTime', checked ? last : '');
    };
    return (
        <div className="field wide">
            <span>
                {t('show.airTime')} <Tip text={t('show.airTimeTip')} />
            </span>
            <label className="check-line">
                <input
                    type="checkbox"
                    checked={airTime !== undefined}
                    onChange={(event) => onTick(event.target.checked)}
                />
                {t('show.setAirTime')}
            </label>
            {airTime && <TimeRoller value={airTime} onChange={(range) => set('airTime', range)} />}
        </div>
    );
}
