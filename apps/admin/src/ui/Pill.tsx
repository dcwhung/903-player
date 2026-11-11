/* 狀態 pill（mockup .pill）：有 dot 嘅係狀態，冇 dot 嘅係標記（待發佈、從未發佈、新） */
import type { ReactNode } from 'react';
import type { Tone } from '../model/status';

interface PillProps {
    tone?: Tone | 'draft' | 'new' | 'count' | 'warn';
    dot?: boolean;
    title?: string;
    children: ReactNode;
}

export function Pill({ tone = 'none', dot = false, title, children }: PillProps) {
    const toneClass = tone === 'none' ? '' : ` ${tone}`;
    return (
        <span className={`pill${toneClass}`} title={title}>
            {dot && <span className="dot" aria-hidden="true" />}
            {children}
        </span>
    );
}
