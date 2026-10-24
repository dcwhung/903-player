import type { ReactNode } from 'react';
import { toPercent } from '../../utils/ratio';
import { PlayIcon } from '../icons/icons';
import { Marquee } from '../Marquee/Marquee';
import { NewBadge } from '../NewBadge/NewBadge';
import { t } from '../../i18n/t';
import styles from './DramaShelf.module.css';

export interface DramaShelfItem {
    id: string;
    name: string;
    /** 劇集原圖（16:9，已經有劇名） */
    art: string;
    /** 角落細字（例如「10 個短篇」/「每日更新」）：平時右下，有「繼續收聽」就讓去右上 */
    meta: string;
    /** 有新嘢先有：左上角出「新」，讀屏講呢句（例如「有新短篇」/「今日有新一集」） */
    newLabel?: string;
    /** 聽過先有：繼續收聽邊集（「短篇 · 第 N 集 集名」）同嗰集聽到幾多（0–1） */
    resume?: { label: string; ratio: number };
    onOpen: () => void;
}

const CONTINUE_ICON_SIZE = 16;

interface DramaShelfProps {
    items: readonly DramaShelfItem[];
    /** 排喺最前嘅格（手機打橫橫額入格） */
    leading?: ReactNode;
}

/** 讀屏名：劇名（+ 繼續收聽邊集）（+ 有新嘢） */
const tileLabel = ({ name, newLabel, resume }: DramaShelfItem): string => {
    const base = resume ? t('drama.tileContinue', { name, label: resume.label }) : name;
    return newLabel ? t('drama.tileNew', { name: base, label: newLabel }) : base;
};

/** 圖底「繼續收聽」條：短篇 · 集數、進度線、▶（成格都係掣，呢度只係顯示） */
const ContinueStrip = ({ label, ratio }: NonNullable<DramaShelfItem['resume']>) => (
    <span className={styles.continue} aria-hidden="true">
        <span className={styles.continueTitle}>{t('drama.continue')}</span>
        <Marquee className={styles.continueLabel} text={label} />
        <span className={styles.continueBar}>
            <span data-continue-fill="" style={{ width: `${toPercent(ratio)}%` }} />
        </span>
        <span className={styles.continuePlay}>
            <PlayIcon size={CONTINUE_ICON_SIZE} />
        </span>
    </span>
);

/** 劇集格：圖上冇字（劇名喺圖入面，靠 aria-label）；同節目格一樣有「New」；聽過就喺圖底出「繼續收聽」 */
const DramaTile = (item: DramaShelfItem) => (
    <button
        type="button"
        className={styles.tile}
        aria-label={tileLabel(item)}
        onClick={item.onOpen}
    >
        <img className={styles.art} src={item.art} alt="" />
        {item.newLabel && <NewBadge className={styles.newBadge} />}
        <span
            className={`${styles.meta} ${item.resume ? styles.metaTop : ''}`}
            data-corner={item.resume ? 'top' : 'bottom'}
            aria-hidden="true"
        >
            {item.meta}
        </span>
        {item.resume && <ContinueStrip {...item.resume} />}
    </button>
);

/**
 * 主頁「廣播劇」tab：一行一套劇（橫版並排）。填滿橫額同 mini player 之間嘅高度，
 * 劇集多到放唔落就自己捲（唯一捲動嘅 panel）
 */
export const DramaShelf = ({ items, leading }: DramaShelfProps) => (
    <nav className={styles.shelf} aria-label={t('home.dramasNav')}>
        {leading}
        {items.map((item) => (
            <DramaTile key={item.id} {...item} />
        ))}
    </nav>
);
