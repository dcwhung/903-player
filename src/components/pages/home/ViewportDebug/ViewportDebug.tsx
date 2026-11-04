import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from './ViewportDebug.module.css';
import { metricRows, readViewport, type ViewportSnapshot } from './viewportMetrics';

interface ViewportDebugProps {
    onClose: () => void;
    /** 量度以外加嘅行（例如播放 log 複製結果） */
    extraRows?: ReadonlyArray<readonly [string, string]>;
}

/** 開咗就量一次（probe 要 render 咗先量到）；Escape 關 */
const useSnapshot = (onClose: () => void) => {
    const probeRef = useRef<HTMLDivElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const [snapshot, setSnapshot] = useState<ViewportSnapshot>();
    useLayoutEffect(() => {
        if (probeRef.current) setSnapshot(readViewport(probeRef.current));
        panelRef.current?.focus();
    }, []);
    useEffect(() => {
        const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [onClose]);
    return { probeRef, panelRef, snapshot };
};

/**
 * 隱藏 viewport debug panel（版本號連撳 5 下開，用戶批准）：列出 viewport / 螢幕尺寸、安全區、
 * --viewport-gap-bottom 同 mini player 離底幾遠，方便喺 iPhone 主畫面 app 對數。撳 panel 或者 Escape 關。
 * 用 portal 掛喺 body：頁面 .scope 係 size container，position: fixed 會跟佢而唔係 viewport
 */
export const ViewportDebug = ({ onClose, extraRows = [] }: ViewportDebugProps) => {
    const { probeRef, panelRef, snapshot } = useSnapshot(onClose);
    return createPortal(
        <div
            ref={panelRef}
            className={styles.panel}
            role="dialog"
            aria-label="Viewport debug"
            tabIndex={-1}
            onClick={(event) => {
                // portal 嘅 click 照 React tree 冒泡去版本號：唔好當係撳多一下
                event.stopPropagation();
                onClose();
            }}
        >
            <div ref={probeRef} className={styles.probe} aria-hidden="true" />
            <dl className={styles.list}>
                {snapshot &&
                    [...metricRows(snapshot), ...extraRows].map(([label, value]) => (
                        <div key={label} className={styles.row}>
                            <dt>{label}</dt>
                            <dd>{value}</dd>
                        </div>
                    ))}
            </dl>
        </div>,
        document.body,
    );
};
