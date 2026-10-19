import { useNavigate } from 'react-router-dom';
import { RadioIcon } from '../components/icons/icons';
import { ShowTile } from '../components/ShowTile/ShowTile';
import { SHOWS } from '../config/shows';
import { useRecordings } from '../data/useRecordings';
import { useStartPlayback } from '../hooks/useStartPlayback';
import { t } from '../i18n/t';
import styles from './HomePage.module.css';
import page from './Page.module.css';

const APP_ICON_SIZE = 18;

export const HomePage = () => {
    const navigate = useNavigate();
    const { status } = useRecordings();
    const { startShow, startToday } = useStartPlayback();

    return (
        <main className={`${page.page} ${styles.home}`}>
            <header className={styles.brand}>
                <span className={styles.appName}>
                    <RadioIcon size={APP_ICON_SIZE} className={styles.appIcon} />
                    {t('appName')}
                </span>
                <h1 className={styles.title}>{t('home.title')}</h1>
            </header>
            <nav
                className={styles.grid}
                aria-label={t('home.showsNav')}
                aria-busy={status === 'loading'}
            >
                {SHOWS.map((show) => (
                    <ShowTile
                        key={show.id}
                        label={show.name}
                        onClick={() => {
                            startShow(show.id);
                            navigate(`/show/${show.id}`);
                        }}
                    />
                ))}
                <ShowTile
                    variant="today"
                    label={t('home.today')}
                    onClick={() => {
                        startToday();
                        navigate('/today');
                    }}
                />
            </nav>
        </main>
    );
};
