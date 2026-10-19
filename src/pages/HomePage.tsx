import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RadioIcon } from '../components/icons/icons';
import { MiniPlayer } from '../components/MiniPlayer/MiniPlayer';
import { ShowTile } from '../components/ShowTile/ShowTile';
import { SHOW_THEMES } from '../config/showThemes';
import { SHOWS } from '../config/shows';
import { useRecordings } from '../data/useRecordings';
import { useMiniPlayer } from '../hooks/useMiniPlayer';
import { useStartPlayback } from '../hooks/useStartPlayback';
import { t } from '../i18n/t';
import { usePlayer } from '../player/usePlayer';
import { isTodayRecording } from '../selectors/recordings';
import { hkToday } from '../utils/date';
import styles from './HomePage.module.css';
import page from './Page.module.css';

const APP_ICON_SIZE = 18;

export const HomePage = () => {
    const navigate = useNavigate();
    const { status } = useRecordings();
    const { startShow, startToday } = useStartPlayback();
    const { stop, recording } = usePlayer();
    const miniPlayer = useMiniPlayer();
    // 只睇入嚟嗰刻播緊乜：今日節目就喺 mini player 繼續播，舊集就暫停並存進度
    const [arrivedWith] = useState(recording);

    useEffect(() => {
        if (!isTodayRecording(arrivedWith, hkToday())) {
            stop();
        }
    }, [arrivedWith, stop]);

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
                        art={SHOW_THEMES[show.id].art}
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
            {miniPlayer && <MiniPlayer {...miniPlayer} />}
        </main>
    );
};
