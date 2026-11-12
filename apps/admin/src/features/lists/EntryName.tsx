/* 列表名稱格：縮圖（角點 = 主項狀態）+ 名（連去編輯頁）+ 待發佈 / 從未發佈 pill + meta */
import { hkToday } from '@903-player/catalog';
import { Link } from 'react-router-dom';
import type { LoadedEntry } from '../../api/types';
import { t } from '../../i18n/t';
import type { ChangeFlags } from '../../model/listModel';
import { imageOf, nameOf } from '../../model/raw';
import { entryDotOf } from '../../model/status';
import { Pill } from '../../ui/Pill';
import { Thumb } from '../../ui/Thumb';

interface EntryNameProps {
    entry: LoadedEntry;
    flags: ChangeFlags;
    meta: string;
}

export function EntryName({ entry, flags, meta }: EntryNameProps) {
    const key = `${entry.kind}:${entry.id}`;
    const never = entry.draft || flags.never.has(key);
    const dot = entryDotOf(entry.kind, entry.definition, entry.draft, hkToday(), entry.published);
    return (
        <div className="name-cell">
            <Thumb url={imageOf(entry.definition, entry.images, 'disc')} dot={dot} />
            <span className="text">
                <Link to={`/${entry.kind}/${entry.id}`}>{nameOf(entry.definition, entry.id)}</Link>
                {(never || flags.pending.has(key)) && (
                    <span className="inline-pills">
                        {never ? (
                            <Pill>{t('status.neverPublished')}</Pill>
                        ) : (
                            <Pill tone="draft">{t('status.pending')}</Pill>
                        )}
                    </span>
                )}
                <span className="meta">{meta}</span>
            </span>
        </div>
    );
}
