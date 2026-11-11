/* 編輯頁頂：flow bar（由待辦入嚟）+ 麵包屑 + 雙擊改名標題 + 狀態 pill（mockup ⑦ / ⑧） */
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { EditableTitle } from '../../ui/EditableTitle';
import { FlowBar } from '../../ui/FlowBar';

interface EditorHeaderProps {
    listPath: string;
    listLabel: string;
    name: string;
    flow: { name: string; missing: string[] } | null;
    onRename?: (name: string) => Promise<void>;
    pills?: ReactNode;
}

export function EditorHeader({
    listPath,
    listLabel,
    name,
    flow,
    onRename,
    pills,
}: EditorHeaderProps) {
    return (
        <>
            {flow && <FlowBar name={flow.name} missing={flow.missing} />}
            <nav className="crumbs" aria-label="breadcrumb">
                <Link to={listPath}>{listLabel}</Link> › {name}
            </nav>
            <div className="title-row">
                <h1>
                    {onRename ? <EditableTitle value={name} onSave={onRename} /> : name}
                    {pills}
                </h1>
            </div>
        </>
    );
}
