import type { ReactNode } from 'react';
import { t } from '../../i18n/t';
import styles from './DramaShelf.module.css';

export interface DramaShelfItem {
    id: string;
    name: string;
    /** 劇集原圖（16:9，已經有劇名） */
    art: string;
    /** 右下角細字（例如「11 個主題」/「每日更新」） */
    meta: string;
    isNew: boolean;
    onOpen: () => void;
}

interface DramaShelfProps {
    items: readonly DramaShelfItem[];
    /** 排喺最前嘅格（手機打橫橫額入格） */
    leading?: ReactNode;
}

/** 劇集格：圖上冇字（劇名喺圖入面，靠 aria-label）；同節目格一樣有「New」 */
const DramaTile = ({ name, art, meta, isNew, onOpen }: DramaShelfItem) => (
    <button
        type="button"
        className={styles.tile}
        aria-label={isNew ? t('home.showNew', { name }) : name}
        onClick={onOpen}
    >
        <img className={styles.art} src={art} alt="" />
        {isNew && (
            <span className={styles.newBadge} aria-hidden="true">
                {t('home.newBadge')}
            </span>
        )}
        <span className={styles.meta} aria-hidden="true">
            {meta}
        </span>
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
