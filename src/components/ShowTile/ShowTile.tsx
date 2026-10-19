import { Disc } from '../Disc/Disc';
import { CalendarIcon } from '../icons/icons';
import styles from './ShowTile.module.css';

interface ShowTileProps {
    label: string;
    variant?: 'show' | 'today';
    onClick: () => void;
}

const TODAY_ICON_SIZE = 28;

export const ShowTile = ({ label, variant = 'show', onClick }: ShowTileProps) => (
    <button
        type="button"
        className={`${styles.tile} ${variant === 'today' ? styles.today : ''}`}
        onClick={onClick}
    >
        {variant === 'today' ? <CalendarIcon size={TODAY_ICON_SIZE} /> : <Disc size="small" />}
        <span>{label}</span>
    </button>
);
