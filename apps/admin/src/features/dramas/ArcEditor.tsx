/*
 * 短篇原位編輯（同展開嗰行同一個底色）：ID + 上架 / 下架 → 簡介 → 聲演 → 虛線框 R2（子資料夾、集數、各集標題）；圖片喺右邊
 * Design Origin: mockup: _mockups_/admin/index.html#s5（.arc-editor）
 */
import { useCallback, useId } from 'react';
import type { RawDefinition } from '../../api/types';
import { t } from '../../i18n/t';
import { countOf, str, strList } from '../../model/raw';
import { Chips } from '../../ui/Chips';
import { Toggle } from '../../ui/Toggle';
import { MediaAside } from '../editor/MediaAside';
import { withOptional } from '../shows/showModel';
import { SummaryField } from '../editor/SummaryField';
import { ArcIdField } from './ArcIdField';
import { updateArc, withTitles } from './dramaModel';
import { EpisodeTitles } from './EpisodeTitles';
import { ReadonlyValue, ScanBox } from './ScanBox';
import type { DramaEditorState } from './useDramaEditor';

export function ArcEditor({
    state,
    arc,
    arcId,
}: {
    state: DramaEditorState;
    arc: RawDefinition;
    arcId: string;
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
                <ArcHead state={state} arc={arc} arcId={arcId} set={set} />
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

type SetArc = (update: (arc: RawDefinition) => RawDefinition) => void;

function ArcHead({
    state,
    arc,
    arcId,
    set,
}: {
    state: DramaEditorState;
    arc: RawDefinition;
    arcId: string;
    set: SetArc;
}) {
    const statusId = useId();
    return (
        <div className="field wide">
            <div className="row3">
                <ArcIdField
                    arcId={arcId}
                    editable={state.isNewArc(arcId)}
                    onCommit={(id) => set((a) => ({ ...a, id }))}
                />
                <div className="field">
                    <span id={statusId}>{t('editor.status')}</span>
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

function ArcScanBox({
    state,
    arc,
    set,
    onErrors,
}: {
    state: DramaEditorState;
    arc: RawDefinition;
    set: SetArc;
    onErrors: (count: number) => void;
}) {
    return (
        <ScanBox
            busy={state.rescan.busy}
            message={state.rescan.message}
            onRescan={() => void state.rescan.run()}
        >
            <div className="row3">
                <ReadonlyValue
                    label={t('drama.subFolder')}
                    value={`${str(arc, 'name') ?? ''}/`}
                    code
                />
                <ReadonlyValue
                    label={t('drama.episodeCount')}
                    value={t('list.episodes', { count: countOf(arc) })}
                />
            </div>
            <EpisodeTitles
                arc={arc}
                onTitles={(titles) => set((a) => withTitles(a, titles))}
                onErrors={onErrors}
            />
        </ScanBox>
    );
}
