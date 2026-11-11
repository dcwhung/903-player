/*
 * 廣播劇 · 短篇：Design Origin: mockup: _mockups_/admin/index.html#s5
 * 拖 ⠿ 改次序（草稿，同其他改動一齊儲存）；撳一行原位展開編輯
 */
import { Fragment, useState } from 'react';
import type { RawDefinition } from '../../api/types';
import { t } from '../../i18n/t';
import { arcLabel, arcsOf } from '../../model/raw';
import { SaveBar } from '../../ui/SaveBar';
import { SortableList } from '../../ui/SortableList';
import { dirtyLabels } from '../editor/entryDraft';
import { ArcEditor } from './ArcEditor';
import { ArcRow } from './ArcRow';
import { arcIdOf, reorderArcs } from './dramaModel';
import type { DramaEditorState } from './useDramaEditor';

const arcItemsOf = (definition: RawDefinition) =>
    arcsOf(definition).map((arc, i) => ({ arc, id: arcIdOf(arc, i) }));

function ArcsHead() {
    return (
        <div className="list-head" aria-hidden="true">
            <span />
            <span>{t('list.colArcs')}</span>
            <span>{t('list.colStatus')}</span>
        </div>
    );
}

export function ArcsTab({ state, openArc }: { state: DramaEditorState; openArc: string }) {
    const { editor } = state;
    const [open, setOpen] = useState<string | null>(openArc || null);
    const arcs = arcItemsOf(editor.draft?.definition ?? {});
    return (
        <>
            <div className="card flush">
                <ArcsHead />
                {arcs.length === 0 && <p className="muted pad">{t('drama.noArcs')}</p>}
                <ol className="list" aria-label={t('drama.arcsLabel')}>
                    <SortableList
                        items={arcs}
                        idOf={(item) => item.id}
                        labelOf={(item) => arcLabel(item.arc)}
                        onReorder={(ids) => editor.setDefinition((d) => reorderArcs(d, ids))}
                        renderItem={(item, sortable) => (
                            <Fragment key={item.id}>
                                <ArcRow
                                    state={state}
                                    arc={item.arc}
                                    arcId={item.id}
                                    open={open === item.id}
                                    onToggle={() => setOpen(open === item.id ? null : item.id)}
                                    sortable={sortable}
                                />
                                {open === item.id && (
                                    <ArcEditor
                                        state={state}
                                        arc={item.arc}
                                        arcId={item.id}
                                        onIdChange={setOpen}
                                    />
                                )}
                            </Fragment>
                        )}
                    />
                </ol>
            </div>
            <SaveBar
                dirtyFields={dirtyLabels(editor.dirtyKeys)}
                fromTodos={state.origin.fromTodos}
                saving={editor.status.saving}
                onSave={() => void state.save()}
                onRevert={editor.revert}
            />
        </>
    );
}
