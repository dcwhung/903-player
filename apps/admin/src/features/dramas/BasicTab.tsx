/*
 * 廣播劇 · 基本資料：Design Origin: mockup: _mockups_/admin/index.html#s4（+ #s4c 資料夾對唔到）
 * ID ⓘ → 簡介 → 類型 / 上架日期 / 狀態 → 虛線框「由 R2 掃描」；圖片喺右邊
 */
import { exampleFileName } from '@903-player/catalog';
import type { RawDefinition } from '../../api/types';
import { nameOf } from '../../model/raw';
import { previewInfoOf } from '../../model/theme';
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

/** 「例：我心不死 - 第 01 集.m4a」：模板 + 第一集（模板一變即刻跟住變） */
const exampleOf = (definition: RawDefinition): string | undefined => {
    const name = exampleFileName(definition);
    return name === undefined ? undefined : t('drama.fileExample', { name });
};

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
                hint={exampleOf(definition)}
            />
        </ScanBox>
    );
}

/** 劇集碟面 / Banner（R2 原圖自動裁切狀態喺 slot 下面） */
function DramaMedia({ state }: { state: DramaEditorState }) {
    const { draft } = state.editor;
    if (!draft) return null;
    return (
        <MediaAside
            id="images"
            target={draft.definition}
            images={draft.images}
            preview={previewInfoOf(draft.definition, nameOf(draft.definition, state.id))}
            auto={state.autoCrop.statusOf()}
            onUploaded={state.saveImage}
        />
    );
}

export function BasicTab({ state }: { state: DramaEditorState }) {
    const { editor, neverPublished } = state;
    const { draft, entry } = editor;
    if (!draft) return null;
    const unconfirmed = state.dramaIdUnconfirmed && neverPublished;
    const tip = unconfirmed
        ? t('editor.idDramaAutoTip')
        : neverPublished
          ? t('editor.idNewTip')
          : t('editor.idLockedTip');
    // 冇改 ID 就儲存 = 確認掃描派嘅 drama-NN（改咗名 server 當已確認）
    const confirmDrama = unconfirmed && state.newId === state.id;
    return (
        <div className="card with-media">
            <DramaMedia state={state} />
            <div className="form">
                <IdField
                    value={state.newId}
                    editable={neverPublished}
                    tip={tip}
                    unconfirmed={confirmDrama}
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
                pendingConfirm={confirmDrama}
                onSave={() => void state.save({ drama: confirmDrama })}
                start={entry && <DeleteEntry entry={entry} neverPublished={neverPublished} />}
            />
        </div>
    );
}
