import { useEffect, useId, useRef } from 'react';
import { t } from '../../i18n/t';
import { scrollBehavior } from '../../utils/motion';
import { scrollChipToCentre } from '../../utils/scroll';
import { ListIcon } from '../icons/icons';
import { NewBadge } from '../NewBadge/NewBadge';
import styles from './ArcPicker.module.css';

export interface ArcChip {
    arc: string;
    /** 上架 14 日內：chip 出「新」 */
    isNew: boolean;
}

interface ArcPickerProps {
    /** 已經排好次序（播放中 → 新上架 → 未聽完 → 已聽完，見 arcGroups） */
    arcs: readonly ArcChip[];
    /** 清單顯示緊邊個短篇 */
    selected: string | undefined;
    /** 播緊嗰集屬於邊個短篇（睇緊其他短篇時 chip 有粒點） */
    playing: string | undefined;
    /** chips 上面嗰行（例如「現正播放：第 2 集 你洽我」） */
    label: string;
    onPick: (arc: string) => void;
    /** 「全集」：打開全集一覽表 */
    onOpenAll: () => void;
}

const LIST_ICON_SIZE = 14;

/** 一粒短篇 chip：揀中實心；播緊（睇緊其他短篇時）右上角一粒點；新上架加「新」 */
const Chip = ({
    chip,
    selected,
    playing,
    ids,
    onPick,
}: { chip: ArcChip; ids: { playing: string; fresh: string } } & Pick<
    ArcPickerProps,
    'selected' | 'playing' | 'onPick'
>) => {
    const isPlayingElsewhere = chip.arc === playing && chip.arc !== selected;
    const describedBy = [isPlayingElsewhere && ids.playing, chip.isNew && ids.fresh]
        .filter(Boolean)
        .join(' ');
    return (
        <button
            type="button"
            className={`${styles.chip} ${isPlayingElsewhere ? styles.playing : ''}`}
            aria-pressed={chip.arc === selected}
            aria-label={chip.arc}
            aria-describedby={describedBy || undefined}
            onClick={() => onPick(chip.arc)}
        >
            {chip.arc}
            {chip.isNew && <NewBadge size="sm" className={styles.fresh} />}
        </button>
    );
};

/**
 * 短篇劇集頁唱片下面：現正播放標籤 + 「☰ 全集」（釘住左邊）+ 一行短篇 chips（左右掃），
 * 揀短篇換下面嘅集數清單。高度同節目頁嘅「現正播放」+ 日子條一樣（tokens.css 嘅播放器高度計法唔使改）
 */
export const ArcPicker = ({ arcs, label, onOpenAll, ...chipProps }: ArcPickerProps) => {
    const rowRef = useRef<HTMLDivElement>(null);
    const ids = { playing: useId(), fresh: useId() };

    // 入頁 / 轉短篇：只喺 chips 嗰行入面將揀中嗰粒捲到正中
    useEffect(() => {
        const row = rowRef.current;
        const chip = row?.querySelector<HTMLElement>('[aria-pressed="true"]');
        if (row && chip) scrollChipToCentre(row, chip, scrollBehavior());
    }, [chipProps.selected]);

    return (
        <div className={styles.group}>
            <span className={styles.label}>{label}</span>
            <div className={styles.row} role="group" aria-label={t('drama.arcs')}>
                <button
                    type="button"
                    className={`${styles.chip} ${styles.all}`}
                    aria-haspopup="dialog"
                    onClick={onOpenAll}
                >
                    <ListIcon size={LIST_ICON_SIZE} />
                    {t('drama.allArcs')}
                </button>
                <div ref={rowRef} className={styles.chips}>
                    {arcs.map((chip) => (
                        <Chip key={chip.arc} chip={chip} ids={ids} {...chipProps} />
                    ))}
                </div>
            </div>
            <span id={ids.playing} hidden>
                {t('drama.arcPlaying')}
            </span>
            <span id={ids.fresh} hidden>
                {t('drama.arcNewLabel')}
            </span>
        </div>
    );
};
