/* 短篇虛線框「由 R2 掃描」：資料夾、集數（唯讀）+ 各集標題（mockup admin-style ⑤ .scan-box） */
import type { RawDefinition } from '../../api/types';
import { t } from '../../i18n/t';
import { countOf, str } from '../../model/raw';
import type { SetArc } from './ArcEditor';
import { withTitles } from './dramaModel';
import { EpisodeTitles } from './EpisodeTitles';
import { ReadonlyValue, ScanBox } from './ScanBox';
import type { DramaEditorState } from './useDramaEditor';

export function ArcScanBox({
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
