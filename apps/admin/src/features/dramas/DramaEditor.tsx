/*
 * 廣播劇編輯：Design Origin: mockup: _mockups_/admin/index.html#s4 / #s5 / #s7
 * 分頁 基本資料 / 短篇 / 排程；由待辦入嚟有 flow bar；轉 tab 記住揀咗嘅短篇（useArcMemory）
 */
import { useLocation, useParams } from 'react-router-dom';
import { t } from '../../i18n/t';
import { arcsOf, nameOf } from '../../model/raw';
import { savedDiscOf } from '../../model/thumbs';
import { Pill } from '../../ui/Pill';
import { EditorHeader } from '../editor/EditorHeader';
import { EditorNotices } from '../editor/EditorNotices';
import { ArcsTab } from './ArcsTab';
import { BasicTab } from './BasicTab';
import { DramaTabs, type DramaTab } from './DramaTabs';
import { ScheduleTab } from './ScheduleTab';
import { useDramaEditor } from './useDramaEditor';
import { arcIdOf } from './dramaModel';
import { useArcMemory } from './useArcMemory';
import { useHashTarget } from './useHashTarget';

function StatusPill({ neverPublished, pending }: { neverPublished: boolean; pending: boolean }) {
    if (neverPublished) return <Pill>{t('status.neverPublished')}</Pill>;
    return pending ? <Pill tone="draft">{t('status.pending')}</Pill> : null;
}

export function DramaEditorPage({ tab }: { tab: DramaTab }) {
    const { id = '' } = useParams();
    return <DramaEditor key={id} id={id} tab={tab} />;
}

function DramaEditor({ id, tab }: { id: string; tab: DramaTab }) {
    const state = useDramaEditor(id);
    const { editor } = state;
    const { hash: rawHash } = useLocation();
    const arcIds = arcsOf(editor.draft?.definition ?? {}).map((arc, i) => arcIdOf(arc, i));
    const memory = useArcMemory(decodeURIComponent(rawHash.slice(1)), arcIds);
    useHashTarget(editor.draft !== null, memory.quietRef);
    if (editor.loadError) return <p className="note bad">{t('editor.notFound')}</p>;
    if (!editor.draft) return <p className="muted">{t('app.loading')}</p>;
    const definition = editor.draft.definition;
    return (
        <>
            <EditorHeader
                listPath="/dramas"
                listLabel={t('list.dramas')}
                name={nameOf(definition, id)}
                flow={state.origin.flow}
                onRename={state.rename}
                disc={savedDiscOf(editor.entry)}
                pills={
                    <StatusPill
                        neverPublished={state.neverPublished}
                        pending={state.pendingPublish}
                    />
                }
            />
            <DramaTabs id={id} tab={tab} arcCount={arcIds.length} arc={memory.arc} />
            <EditorNotices
                status={editor.status}
                fieldErrors={state.errorCount}
                onReload={() => void editor.reload()}
            />
            {tab === 'basic' && <BasicTab state={state} />}
            {tab === 'arcs' && (
                <ArcsTab state={state} openArc={memory.arc} onPick={memory.remember} />
            )}
            {tab === 'schedule' && (
                <ScheduleTab state={state} initialArc={memory.arc} onPick={memory.remember} />
            )}
        </>
    );
}
