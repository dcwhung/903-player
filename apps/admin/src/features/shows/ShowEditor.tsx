/*
 * 節目編輯：Design Origin: mockup: _mockups_/admin/index.html#s3
 * 一格包晒（ID → 簡介 → 播出日 → 播放時間 → 主持），圖片喺右邊；單一儲存掣，有改動先出提示
 */
import { t } from '../../i18n/t';
import { nameOf } from '../../model/raw';
import { Pill } from '../../ui/Pill';
import { SaveBar } from '../../ui/SaveBar';
import { useParams } from 'react-router-dom';
import { DeleteEntry } from '../editor/DeleteEntry';
import { EditorHeader } from '../editor/EditorHeader';
import { EditorNotices } from '../editor/EditorNotices';
import { dirtyLabels } from '../editor/entryDraft';
import { idProblem } from '../editor/IdField';
import { MediaAside } from '../editor/MediaAside';
import { ShowFields } from './ShowFields';
import { ShowPreview } from './ShowPreview';
import { useShowEditor } from './useShowEditor';

export function ShowEditorPage() {
    const { id } = useParams();
    return <ShowEditor key={id ?? 'new'} id={id} />;
}

function ShowStatusPill({ off }: { off: boolean }) {
    return (
        <Pill tone={off ? 'bad' : 'ok'} dot>
            {off ? t('status.off') : t('status.showLive')}
        </Pill>
    );
}

function ShowEditor({ id }: { id: string | undefined }) {
    const { isNew, editor, newId, setNewId, origin, save, neverPublished, saveImage, rename } =
        useShowEditor(id);
    const { draft, entry, status } = editor;
    if (editor.loadError) return <p className="note bad">{t('editor.notFound')}</p>;
    if (!draft) return <p className="muted">{t('app.loading')}</p>;
    const name = nameOf(draft.definition, isNew ? t('show.newTitle') : (id ?? ''));
    const off = draft.definition.enabled === false;
    return (
        <>
            <EditorHeader
                listPath="/shows"
                listLabel={t('list.shows')}
                name={name}
                flow={origin.flow}
                onRename={isNew ? undefined : rename}
                pills={!isNew && <ShowStatusPill off={off} />}
            />
            <EditorNotices
                status={status}
                fieldErrors={isNew && newId !== '' && idProblem(newId) ? 1 : 0}
                onReload={() => void editor.reload()}
            />
            <div className="card with-media">
                <MediaAside
                    target={draft.definition}
                    images={draft.images}
                    onUploaded={saveImage}
                />
                <div className="form">
                    <ShowFields
                        id={isNew ? newId : (id ?? '')}
                        isNew={isNew}
                        onId={setNewId}
                        definition={draft.definition}
                        onChange={editor.setDefinition}
                    />
                </div>
                <ShowPreview definition={draft.definition} />
                <SaveBar
                    dirtyFields={dirtyLabels(editor.dirtyKeys)}
                    fromTodos={origin.fromTodos}
                    saving={status.saving}
                    onSave={() => void save()}
                    start={entry && <DeleteEntry entry={entry} neverPublished={neverPublished} />}
                />
            </div>
        </>
    );
}
