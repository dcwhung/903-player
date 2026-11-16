/*
 * 短篇原位編輯（同展開嗰行同一個底色）：名稱 → ID + 狀態（未排期 pill 喺 label 隔籬）→ 簡介 → 聲演 →
 * 虛線框 R2（資料夾、集數、各集標題）；橫圖 / 碟面喺右邊。
 * 已發佈短篇同已發佈唔同嘅欄位原位出「已修改」「還原」（mockup admin-revert ③），其他欄位喺最尾一行
 * Design Origin: mockup: _mockups_/admin-style/index.html#e（.arc-body）；結構 mockup: _mockups_/admin/index.html#s5
 */
import { arcIdOf as arcKeyOf } from '@903-player/catalog';
import { useCallback } from 'react';
import type { RawDefinition } from '../../api/types';
import { arcLabel } from '../../model/raw';
import { previewInfoOf } from '../../model/theme';
import { MediaAside } from '../editor/MediaAside';
import { SummaryField } from '../editor/SummaryField';
import { OtherRevert } from '../revert/FieldRevert';
import { ARC_PLACED } from '../revert/placedFields';
import { useEntryRevert } from '../revert/useEntryRevert';
import { ArcCastField, ArcHead, ArcNameField } from './ArcFields';
import { ArcScanBox } from './ArcScanBox';
import { updateArc } from './dramaModel';
import type { DramaEditorState } from './useDramaEditor';

export type { SetArc } from './ArcFields';

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
    // 還原用 catalog 嘅短篇 key（id，冇就用名），同 api 一樣
    const revert = useEntryRevert(editor, arcKeyOf(arc));
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
                preview={previewInfoOf(editor.draft?.definition ?? {}, arcLabel(arc))}
                auto={state.autoCrop.statusOf(arcId)}
                onUploaded={(slot, name) => state.saveImage(slot, name, arcId)}
                revert={revert}
            />
            <div className="form">
                <ArcNameField arc={arc} set={set} revert={revert} />
                <ArcHead
                    state={state}
                    arc={arc}
                    arcId={arcId}
                    set={set}
                    revert={revert}
                    onIdChange={onIdChange}
                />
                <SummaryField target={arc} onChange={set} revert={revert} />
                <ArcCastField arc={arc} set={set} revert={revert} />
                <ArcScanBox state={state} arc={arc} set={set} onErrors={onErrors} />
                <OtherRevert revert={revert} placed={ARC_PLACED} />
            </div>
        </li>
    );
}
