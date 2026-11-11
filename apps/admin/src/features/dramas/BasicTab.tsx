/*
 * 廣播劇 · 基本資料：Design Origin: mockup: _mockups_/admin/index.html#s4（+ #s4c 資料夾對唔到）
 * ID ⓘ → 簡介 → 類型 / 上架日期 / 狀態 → 虛線框「由 R2 掃描」；圖片喺右邊
 */
import { t } from '../../i18n/t';
import { DeleteEntry } from '../editor/DeleteEntry';
import { dirtyLabels } from '../editor/entryDraft';
import { IdField } from '../editor/IdField';
import { MediaAside } from '../editor/MediaAside';
import { SummaryField } from '../editor/SummaryField';
import { SaveBar } from '../../ui/SaveBar';
import { BasicFields } from './BasicFields';
import { r2FolderOf, r2TemplateOf } from './dramaModel';
import { MissingFolder } from './MissingFolder';
import { ReadonlyValue, ScanBox } from './ScanBox';
import type { DramaEditorState } from './useDramaEditor';

function R2Fields({ state }: { state: DramaEditorState }) {
    const { editor, rescan } = state;
    const definition = editor.draft?.definition ?? {};
    const folder = r2FolderOf(definition) ?? '';
    if (state.missingFolder)
        return (
            <MissingFolder
                dramaId={state.id}
                folder={folder}
                etag={editor.entry?.etag ?? null}
                onPaired={async () => {
                    await editor.reload();
                    await state.origin.afterSave();
                }}
            />
        );
    return (
        <ScanBox
            id="folder"
            busy={rescan.busy}
            message={rescan.message}
            onRescan={() => void rescan.run()}
        >
            <ReadonlyValue label={t('drama.folder')} value={`${folder}/`} code />
            <ReadonlyValue
                label={t('drama.fileTemplate')}
                value={r2TemplateOf(definition) ?? ''}
                code
            />
        </ScanBox>
    );
}

export function BasicTab({ state }: { state: DramaEditorState }) {
    const { editor, neverPublished } = state;
    const { draft, entry } = editor;
    if (!draft) return null;
    const tip = neverPublished ? t('editor.idNewTip') : t('editor.idLockedTip');
    return (
        <div className="card with-media">
            <MediaAside
                id="images"
                target={draft.definition}
                images={draft.images}
                onUploaded={state.saveImage}
            />
            <div className="form">
                <IdField
                    value={state.newId}
                    editable={neverPublished}
                    tip={tip}
                    onChange={state.setNewId}
                />
                <SummaryField target={draft.definition} onChange={editor.setDefinition} />
                <BasicFields
                    definition={draft.definition}
                    kindLocked={!neverPublished}
                    onChange={editor.setDefinition}
                />
                <R2Fields state={state} />
            </div>
            <SaveBar
                dirtyFields={dirtyLabels([
                    ...editor.dirtyKeys,
                    ...(state.newId !== state.id ? ['id'] : []),
                ])}
                fromTodos={state.origin.fromTodos}
                saving={editor.status.saving}
                onSave={() => void state.save()}
                start={entry && <DeleteEntry entry={entry} neverPublished={neverPublished} />}
            />
        </div>
    );
}
