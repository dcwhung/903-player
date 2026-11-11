/* 列表標題 + icon-only「＋」新增掣（mockup ⑤ / ⑥ .title-row） */
import { Plus } from 'lucide-react';

interface ListTitleProps {
    title: string;
    addLabel: string;
    onAdd: () => void;
}

export function ListTitle({ title, addLabel, onAdd }: ListTitleProps) {
    return (
        <div className="title-row">
            <h1>{title}</h1>
            <button
                type="button"
                className="primary icon-btn"
                aria-label={addLabel}
                title={addLabel}
                onClick={onAdd}
            >
                <Plus aria-hidden="true" />
            </button>
        </div>
    );
}
