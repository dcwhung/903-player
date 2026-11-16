import type { ReactNode, Ref } from 'react';
import type { SheetState } from './useSheetPresence';
import motion from './SheetMotion.module.css';

interface SheetBackdrop {
    className: string | undefined;
    testId: string;
    onClick: () => void;
}

interface SheetOverlayProps {
    /** useSheetPresence 嘅 state / inert / overlayRef */
    state: SheetState;
    inert: boolean;
    overlayRef: Ref<HTMLDivElement>;
    /** 各 sheet 自己嘅 overlay class（直版 fixed / 橫版 docked） */
    className: string;
    /** 直版遮罩（撳就閂）；橫版 docked 冇 */
    backdrop?: SheetBackdrop | undefined;
    backdropRef?: Ref<HTMLDivElement> | undefined;
    /** overlay 額外 data attribute（例如資料 sheet 嘅 data-info-sheet，版面 CSS 認佢） */
    data?: Record<`data-${string}`, string> | undefined;
    children: ReactNode;
}

/**
 * 底部 sheet 外層（全集 ArcSheet、資料 ItemInfoSheet 共用）：掛 useSheetPresence 嘅 ref / 狀態，
 * 遮罩跟表一齊淡入淡出（SheetMotion.module.css）；表本身（children）要加 SheetMotion 嘅 .sheet
 */
export const SheetOverlay = ({
    state,
    inert,
    overlayRef,
    className,
    backdrop,
    backdropRef,
    data,
    children,
}: SheetOverlayProps) => (
    <div ref={overlayRef} className={className} data-sheet-state={state} inert={inert} {...data}>
        {backdrop && (
            <div
                ref={backdropRef}
                className={`${backdrop.className ?? ''} ${motion.backdrop}`}
                data-testid={backdrop.testId}
                onClick={backdrop.onClick}
            />
        )}
        {children}
    </div>
);
