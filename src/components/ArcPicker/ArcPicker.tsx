import { useEffect, useId, useRef } from 'react';
import { t } from '../../i18n/t';
import { scrollBehavior } from '../../utils/motion';
import { scrollChipToCentre } from '../../utils/scroll';
import styles from './ArcPicker.module.css';

interface ArcPickerProps {
    arcs: readonly string[];
    /** 清單顯示緊邊個主題 */
    selected: string | undefined;
    /** 播緊嗰集屬於邊個主題（睇緊其他主題時 chip 有粒點） */
    playing: string | undefined;
    /** chips 上面嗰行（例如「現正播放：第 2 集 你洽我」） */
    label: string;
    onPick: (arc: string) => void;
}

/**
 * 主題劇集頁唱片下面：現正播放標籤 + 一行主題 chips（左右掃），揀主題換下面嘅集數清單。
 * 高度同節目頁嘅「現正播放」+ 日子條一樣（tokens.css 嘅播放器高度計法唔使改）
 */
export const ArcPicker = ({ arcs, selected, playing, label, onPick }: ArcPickerProps) => {
    const rowRef = useRef<HTMLDivElement>(null);
    const playingId = useId();

    // 入頁 / 轉主題：只喺 chips 嗰行入面將揀中嗰粒捲到正中
    useEffect(() => {
        const row = rowRef.current;
        const chip = row?.querySelector<HTMLElement>('[aria-pressed="true"]');
        if (row && chip) scrollChipToCentre(row, chip, scrollBehavior());
    }, [selected]);

    return (
        <div className={styles.group}>
            <span className={styles.label}>{label}</span>
            <div ref={rowRef} className={styles.chips} role="group" aria-label={t('drama.arcs')}>
                {arcs.map((arc) => {
                    const isPlayingElsewhere = arc === playing && arc !== selected;
                    return (
                        <button
                            key={arc}
                            type="button"
                            className={`${styles.chip} ${isPlayingElsewhere ? styles.playing : ''}`}
                            aria-pressed={arc === selected}
                            aria-describedby={isPlayingElsewhere ? playingId : undefined}
                            onClick={() => onPick(arc)}
                        >
                            {arc}
                        </button>
                    );
                })}
            </div>
            <span id={playingId} hidden>
                {t('drama.arcPlaying')}
            </span>
        </div>
    );
};
