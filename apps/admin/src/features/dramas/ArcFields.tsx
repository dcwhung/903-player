/*
 * 短篇原位編輯嘅欄位：名稱（displayName）、ID + 狀態（未排期 pill 喺 label 隔籬）；
 * revert = 已發佈短篇同已發佈唔同：「已修改」「還原」+「已發佈：…」（狀態連下架日期一齊還原）
 */
import { useId } from 'react';
import type { RawDefinition } from '../../api/types';
import { t } from '../../i18n/t';
import { str, strList } from '../../model/raw';
import { Chips } from '../../ui/Chips';
import { Pill } from '../../ui/Pill';
import { Tip } from '../../ui/Tip';
import { Toggle } from '../../ui/Toggle';
import { PublishedHint } from '../revert/FieldRevert';
import { RevertLabel } from '../revert/RevertLabel';
import { STATUS_FIELDS, StatusHint } from '../revert/StatusRevert';
import type { EntryRevert } from '../revert/useEntryRevert';
import { withOptional } from '../shows/showModel';
import { ArcIdField } from './ArcIdField';
import type { DramaEditorState } from './useDramaEditor';

export type SetArc = (update: (arc: RawDefinition) => RawDefinition) => void;

const NAME = ['displayName'];
const CAST = ['cast'];

interface ArcFieldProps {
    arc: RawDefinition;
    set: SetArc;
    revert: EntryRevert;
}

/** 名稱 = 播放器顯示名（displayName）；R2 資料夾名（name）唔改 */
export function ArcNameField({ arc, set, revert }: ArcFieldProps) {
    const id = useId();
    return (
        <div className="field wide arc-name">
            <RevertLabel label={t('drama.arcName')} htmlFor={id} revert={revert} fields={NAME}>
                <Tip text={t('drama.arcNameTip')} />
            </RevertLabel>
            <input
                id={id}
                type="text"
                value={str(arc, 'displayName') ?? str(arc, 'name') ?? ''}
                onChange={(e) => set((a) => withOptional(a, 'displayName', e.target.value))}
            />
            <PublishedHint revert={revert} fields={NAME} />
        </div>
    );
}

export function ArcCastField({ arc, set, revert }: ArcFieldProps) {
    return (
        <div className="field wide">
            <RevertLabel label={t('drama.cast')} revert={revert} fields={CAST} />
            <Chips
                label={t('drama.cast')}
                values={strList(arc, 'cast')}
                onChange={(cast) => set((a) => withOptional(a, 'cast', cast))}
            />
            <PublishedHint revert={revert} fields={CAST} />
        </div>
    );
}

/** 「未排期」提示：新短篇下架（行嘅狀態 pill 寫「未上架」，呢度提醒要去排程） */
const unscheduledOf = (state: DramaEditorState, arc: RawDefinition, arcId: string) =>
    arc.enabled === false && state.isNewArc(arcId);

interface ArcHeadProps extends ArcFieldProps {
    state: DramaEditorState;
    arcId: string;
    onIdChange: (id: string) => void;
}

export function ArcHead({ state, arc, arcId, set, revert, onIdChange }: ArcHeadProps) {
    const statusId = useId();
    return (
        <div className="field wide">
            <div className="row3">
                <ArcIdField
                    arcId={arcId}
                    editable={state.isNewArc(arcId) || state.isArcIdUnconfirmed(arcId)}
                    unconfirmed={state.isArcIdUnconfirmed(arcId)}
                    onCommit={(id) => {
                        set((a) => ({ ...a, id }));
                        onIdChange(id);
                    }}
                />
                <div className="field">
                    <RevertLabel
                        label={t('editor.status')}
                        id={statusId}
                        revert={revert}
                        fields={STATUS_FIELDS}
                    >
                        {unscheduledOf(state, arc, arcId) && (
                            <Pill tone="warn">{t('status.unscheduled')}</Pill>
                        )}
                    </RevertLabel>
                    <Toggle
                        on={arc.enabled !== false}
                        labelledBy={statusId}
                        onChange={(on) => set((a) => ({ ...a, enabled: on }))}
                    />
                    <StatusHint revert={revert} />
                </div>
            </div>
        </div>
    );
}
