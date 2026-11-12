/*
 * 節目編輯：Design Origin: mockup: _mockups_/admin/index.html#s3
 * 一格包晒（ID → 簡介 → 播出日 → 播放時間 → 主持），圖片喺右邊；單一儲存掣，有改動先出提示
 */
import { t } from '../../i18n/t';
import { nameOf } from '../../model/raw';
import { showStatusOf } from '../../model/status';
import { Pill } from '../../ui/Pill';
import { useParams } from 'react-router-dom';
import { savedDiscOf } from '../../model/thumbs';
import { EditorHeader } from '../editor/EditorHeader';
import { EditorNotices } from '../editor/EditorNotices';
import { idProblem } from '../editor/IdField';
import { ShowEditorCard } from './ShowEditorCard';
import { useShowEditor } from './useShowEditor';

export function ShowEditorPage() {
    const { id } = useParams();
    return <ShowEditor key={id ?? 'new'} id={id} />;
}

/** 標題旁狀態 pill：跟住草稿嘅上架 toggle（新節目唔出） */
function ShowStatusPill({ show }: { show: ReturnType<typeof useShowEditor> }) {
    const definition = show.editor.draft?.definition;
    if (show.isNew || !definition) return null;
    const status = showStatusOf(definition, show.published);
    return (
        <Pill tone={status.tone} dot>
            {status.text}
        </Pill>
    );
}

function ShowEditor({ id }: { id: string | undefined }) {
    const show = useShowEditor(id);
    const { isNew, editor, newId, origin } = show;
    const { draft, entry, status } = editor;
    if (editor.loadError) return <p className="note bad">{t('editor.notFound')}</p>;
    if (!draft) return <p className="muted">{t('app.loading')}</p>;
    const name = nameOf(draft.definition, isNew ? t('show.newTitle') : (id ?? ''));
    return (
        <>
            <EditorHeader
                listPath="/shows"
                listLabel={t('list.shows')}
                name={name}
                flow={origin.flow}
                onRename={isNew ? undefined : show.rename}
                pills={<ShowStatusPill show={show} />}
                disc={savedDiscOf(entry)}
            />
            <EditorNotices
                status={status}
                fieldErrors={isNew && newId !== '' && idProblem(newId) ? 1 : 0}
                onReload={() => void editor.reload()}
            />
            <ShowEditorCard show={show} name={name} />
        </>
    );
}
