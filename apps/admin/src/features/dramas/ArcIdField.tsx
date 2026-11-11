/* 短篇 ID：未發佈可改（離開欄位 / Enter 先套用，合規先寫），發佈咗唯讀 */
import { useState } from 'react';
import { t } from '../../i18n/t';
import { IdField, idProblem } from '../editor/IdField';

interface ArcIdFieldProps {
    arcId: string;
    editable: boolean;
    onCommit: (id: string) => void;
}

export function ArcIdField({ arcId, editable, onCommit }: ArcIdFieldProps) {
    const [text, setText] = useState(arcId);
    const commit = () => {
        if (text !== arcId && !idProblem(text)) onCommit(text);
    };
    return (
        <div onBlur={commit} onKeyDown={(event) => event.key === 'Enter' && commit()}>
            <IdField
                label={t('drama.arcId')}
                value={editable ? text : arcId}
                editable={editable}
                tip={editable ? t('editor.idNewTip') : t('editor.idLockedTip')}
                onChange={setText}
            />
        </div>
    );
}
