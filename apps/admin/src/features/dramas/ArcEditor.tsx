/*
 * 短篇原位編輯（同展開嗰行同一個底色）：名稱 → ID + 狀態（未排期 pill 喺 label 隔籬）→ 簡介 → 聲演 →
 * 虛線框 R2（資料夾、集數、各集標題）；Banner / 碟面喺右邊
 * Design Origin: mockup: _mockups_/admin-style/index.html#e（.arc-body）；結構 mockup: _mockups_/admin/index.html#s5
 */
import { hkToday } from '@903-player/catalog';
import { useCallback, useId } from 'react';
import type { RawDefinition } from '../../api/types';
import { t } from '../../i18n/t';
import { str, strList } from '../../model/raw';
import { arcStatusOf } from '../../model/status';
import { Pill } from '../../ui/Pill';
import { Tip } from '../../ui/Tip';
import { Chips } from '../../ui/Chips';
import { Toggle } from '../../ui/Toggle';
import { MediaAside } from '../editor/MediaAside';
import { withOptional } from '../shows/showModel';
import { SummaryField } from '../editor/SummaryField';
import { ArcIdField } from './ArcIdField';
import { updateArc } from './dramaModel';
import { ArcScanBox } from './ArcScanBox';
import type { DramaEditorState } from './useDramaEditor';

export function ArcEditor({
    state,
    arc,
    arcId,
    onIdChange,
}: {
    state: DramaEditorState;
    arc: RawDefinition;
    arcId: string;
    /** 改咗 ID：展開狀態跟住新 ID */
    onIdChange: (id: string) => void;
}) {
    const { editor, setFieldError } = state;
    const set = (update: (arc: RawDefinition) => RawDefinition) =>
        editor.setDefinition((d) => updateArc(d, arcId, update));
    const onErrors = useCallback(
        (count: number) => setFieldError(`titles:${arcId}`, count),
        [setFieldError, arcId],
    );
    return (
        <li className="arc-editor with-media" id={`editor-${arcId}`}>
            <MediaAside
                target={arc}
                images={editor.draft?.images ?? {}}
                onUploaded={(slot, name) => state.saveImage(slot, name, arcId)}
            />
            <div className="form">
                <ArcNameField arc={arc} set={set} />
                <ArcHead state={state} arc={arc} arcId={arcId} set={set} onIdChange={onIdChange} />
                <SummaryField target={arc} onChange={set} />
                <div className="field wide">
                    <span>{t('drama.cast')}</span>
                    <Chips
                        label={t('drama.cast')}
                        values={strList(arc, 'cast')}
                        onChange={(cast) => set((a) => withOptional(a, 'cast', cast))}
                    />
                </div>
                <ArcScanBox state={state} arc={arc} set={set} onErrors={onErrors} />
            </div>
        </li>
    );
}

export type SetArc = (update: (arc: RawDefinition) => RawDefinition) => void;

/** 名稱 = 播放器顯示名（displayName）；R2 資料夾名（name）唔改 */
function ArcNameField({ arc, set }: { arc: RawDefinition; set: SetArc }) {
    return (
        <label className="field wide arc-name">
            <span>
                {t('drama.arcName')} <Tip text={t('drama.arcNameTip')} />
            </span>
            <input
                type="text"
                value={str(arc, 'displayName') ?? str(arc, 'name') ?? ''}
                onChange={(e) => set((a) => withOptional(a, 'displayName', e.target.value))}
            />
        </label>
    );
}

/** 「未排期」pill：新短篇下架又未排程 */
const unscheduledOf = (state: DramaEditorState, arc: RawDefinition, arcId: string) =>
    arcStatusOf(state.editor.draft?.definition ?? {}, arc, hkToday(), state.isNewArc(arcId))
        .text === t('status.unscheduled');

function ArcHead({
    state,
    arc,
    arcId,
    set,
    onIdChange,
}: {
    state: DramaEditorState;
    arc: RawDefinition;
    arcId: string;
    set: SetArc;
    onIdChange: (id: string) => void;
}) {
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
                    <span className="label-line">
                        <span id={statusId}>{t('editor.status')}</span>
                        {unscheduledOf(state, arc, arcId) && (
                            <Pill tone="warn">{t('status.unscheduled')}</Pill>
                        )}
                    </span>
                    <Toggle
                        on={arc.enabled !== false}
                        labelledBy={statusId}
                        onChange={(on) => set((a) => ({ ...a, enabled: on }))}
                    />
                </div>
            </div>
        </div>
    );
}
