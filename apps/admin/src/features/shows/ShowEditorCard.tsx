/*
 * 節目編輯卡：Design Origin: mockup: _mockups_/admin/index.html#s3
 * 一格包晒（ID → 簡介 → 播出日 → 播放時間 → 主持），圖片喺右邊；單一儲存掣，有改動先出提示
 */
import { previewInfoOf } from '../../model/theme';
import { SaveBar } from '../../ui/SaveBar';
import { DeleteEntry } from '../editor/DeleteEntry';
import { dirtyLabels } from '../editor/entryDraft';
import { MediaAside } from '../editor/MediaAside';
import { ShowFields } from './ShowFields';
import { ShowPreview } from './ShowPreview';
import type { ShowEditorState } from './useShowEditor';

export function ShowEditorCard({ show, name }: { show: ShowEditorState; name: string }) {
    const { isNew, editor, newId, setNewId, origin, save, neverPublished, id } = show;
    const { draft, entry, status } = editor;
    if (!draft) return null;
    return (
        <div className="card with-media">
            <MediaAside
                target={draft.definition}
                images={draft.images}
                preview={previewInfoOf(draft.definition, name)}
                onUploaded={show.saveImage}
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
    );
}
