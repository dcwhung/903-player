import { useParams } from 'react-router-dom';
import type { ComponentProps, ReactNode } from 'react';
import { PageHeader } from '../../components/shared/common/PageHeader/PageHeader';
import { InnerPageHandle } from '../../components/shared/player/InnerPageHandle/InnerPageHandle';
import { StatusMessage } from '../../components/shared/common/StatusMessage/StatusMessage';
import { ThemeScope } from '../../components/shared/common/ThemeScope/ThemeScope';
import { LANDSCAPE_LAYOUT_QUERY, SQUARE_QUERY } from '../../config/layout';
import { useEpisodeFocus } from '../../hooks/useEpisodeFocus';
import { useGoHome } from '../../hooks/useGoHome';
import { useListSheet } from '../../hooks/useListSheet';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { t } from '../../i18n/t';
import { LoadState } from '../shared/LoadState';
import page from '../shared/Page.module.css';
import { ShowEpisodes, ShowHeaderActions } from './ShowEpisodes';
import { ShowPlayer } from './ShowPlayer';
import { useShowPage } from './useShowPage';

type ShowData = ReturnType<typeof useShowPage>;

interface ShowPlayerColumnProps {
    data: ShowData;
    /** 播放器上面嘅頁頭（橫版有清單時喺左欄，呢度冇） */
    header: ReactNode;
    landscape: boolean;
    square: boolean;
}

/** 播放器欄：（頁頭 +）載入 / 搵唔到訊息 + 播放器 */
const ShowPlayerColumn = ({ data, header, landscape, square }: ShowPlayerColumnProps) => {
    const { show, status, isSearching, episodeItems } = data;
    return (
        <div className={page.playerColumn}>
            {header}
            {!show ? (
                <StatusMessage message={t('common.showNotFound')} />
            ) : (
                // 乜都冇先講「暫時未有錄音」/ 搵緊；有未上架嘅就由下面講「未有集數上架」
                <LoadState
                    status={status}
                    isEmpty={episodeItems.length === 0}
                    isSearching={isSearching}
                />
            )}
            {show && status === 'ready' && episodeItems.length > 0 && (
                <ShowPlayer
                    {...data}
                    title={show.name}
                    landscape={landscape}
                    infoInHeader={square}
                />
            )}
        </div>
    );
};

/**
 * 版面：橫版（左清單右播放器）/ HomeView（544×544，P10 lane 6：播放器為主，集數清單收入頁頭清單掣開嘅
 * sheet，ⓘ 搬上頁頭）/ 直版。有集數（包括未上架）就列清單；橫版有清單：頁頭喺左欄清單上面
 */
const useShowLayout = ({ show, status, episodeItems, focusKey }: ShowData) => {
    const landscape = useMediaQuery(LANDSCAPE_LAYOUT_QUERY);
    const square = useMediaQuery(SQUARE_QUERY);
    const list = useListSheet(focusKey);
    const listed = show !== undefined && status === 'ready' && episodeItems.length > 0;
    return { landscape, square, list, listed, headerInList: landscape && listed };
};

interface ShowHeaderProps {
    title: string;
    onBack: () => void;
    /** HomeView 頁頭右邊（清單掣 + ⓘ）；冇就留返空位，標題置中 */
    actions: ComponentProps<typeof ShowHeaderActions> | undefined;
}

const ShowHeader = ({ title, onBack, actions }: ShowHeaderProps) => (
    <div className={page.header}>
        <PageHeader
            title={title}
            variant="title"
            onBack={onBack}
            trailing={actions && <ShowHeaderActions {...actions} />}
        />
    </div>
);

/**
 * 成頁固定唔捲，得集數清單自己捲（見 Page.module.css .locked / .fixed）；
 * 節目名喺頁頭（取代「正在播放」），唱片下面變成日子條。
 * 橫版左欄（頁頭 + 集數）、右欄（播放器 + 現正播放）；直版兩欄 display: contents，次序照舊；
 * HomeView 清單收入 sheet（ShowEpisodes）
 */
export const ShowPage = () => {
    const { showId = '' } = useParams();
    const goHome = useGoHome({ kind: 'show', showId });
    const focusId = useEpisodeFocus(); // 由「我的收藏」撳行入嚟：唔播，捲去嗰集
    const data = useShowPage(showId, focusId);
    const { show, theme, episodeItems } = data;
    const { landscape, square, list, listed, headerInList } = useShowLayout(data);
    const actions = { items: episodeItems, list, info: data.info.gaugeInfo };
    const header = (
        <ShowHeader
            title={show?.name ?? ''}
            onBack={goHome}
            actions={square && listed ? actions : undefined}
        />
    );

    return (
        <ThemeScope theme={theme}>
            <main
                className={`${page.page} ${page.locked} ${page.fixed}`}
                data-player-page=""
                data-square-player={square ? '' : undefined}
            >
                <ShowPlayerColumn
                    data={data}
                    header={!headerInList && header}
                    landscape={landscape}
                    square={square}
                />
                {listed && (
                    <ShowEpisodes
                        square={square}
                        header={headerInList && header}
                        items={episodeItems}
                        onSelect={data.pressEpisode}
                        focusKey={data.focusKey}
                        list={list}
                    />
                )}
                <InnerPageHandle page={{ kind: 'show', showId }} />
            </main>
        </ThemeScope>
    );
};
