/*
 * 欄位標題行（mockup admin-revert ③ .field-head）：標題 +（同已發佈唔同先出）「已修改」「還原」。
 * htmlFor = 用 <label> 指去輸入框；id = 用 aria-labelledby 嘅控制（狀態 toggle、chips）
 */
import type { ReactNode } from 'react';
import { RevertMark } from './FieldRevert';
import type { EntryRevert } from './useEntryRevert';

interface RevertLabelProps {
    label: string;
    revert: EntryRevert | undefined;
    fields: readonly string[];
    htmlFor?: string;
    id?: string;
    /** 標題後面（例如 ⓘ tip、「未排期」pill） */
    children?: ReactNode;
}

export function RevertLabel({ label, revert, fields, htmlFor, id, children }: RevertLabelProps) {
    return (
        <span className="label-line">
            {htmlFor ? <label htmlFor={htmlFor}>{label}</label> : <span id={id}>{label}</span>}
            {children}
            {revert && <RevertMark revert={revert} fields={fields} name={label} />}
        </span>
    );
}
