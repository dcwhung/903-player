import { useNavigate } from 'react-router-dom';
import { AppVersion } from '../components/AppVersion/AppVersion';
import { HomeBanner } from '../components/HomeBanner/HomeBanner';
import { MiniPlayer } from '../components/MiniPlayer/MiniPlayer';
import { ShowTile } from '../components/ShowTile/ShowTile';
import { ThemeScope } from '../components/ThemeScope/ThemeScope';
import { APP_VERSION } from '../config/appVersion';
import { HOME_THEME, SHOW_THEMES } from '../config/showThemes';
import { SHOWS } from '../config/shows';
import { useRecordings } from '../data/useRecordings';
import { useHomeArrival } from '../hooks/useHomeArrival';
import { useMiniPlayer } from '../hooks/useMiniPlayer';
import { useStartPlayback } from '../hooks/useStartPlayback';
import { t } from '../i18n/t';
import styles from './HomePage.module.css';
import page from './Page.module.css';

export const HomePage = () => {
    const navigate = useNavigate();
    const { status } = useRecordings();
    const { startShow, startToday } = useStartPlayback();
    const miniPlayer = useMiniPlayer();
    useHomeArrival();

    return (
        // 主頁用自己嘅色調（跟 app icon）；mini player 入面另有 ThemeScope，照跟節目色。
        // canvas 用漸變底色：iOS standalone viewport 矮過螢幕時，home indicator 後面露出 canvas 同漸變接得順
        <ThemeScope theme={HOME_THEME} className={styles.scope} canvas="var(--home-bg-bottom)">
            {/* 主頁都固定唔捲（page.locked）；好矮嘅畫面改由 main 自己捲 */}
            <main className={`${page.page} ${page.locked} ${styles.home}`}>
                <HomeBanner />
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
                <AppVersion version={APP_VERSION} />
                {miniPlayer && <MiniPlayer {...miniPlayer} />}
            </main>
        </ThemeScope>
    );
};
