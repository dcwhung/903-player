export const zhHK = {
    appName: '903 Player',
    common: {
        back: '返回主頁',
        loading: '載入中…',
        loadError: '未能載入節目列表，請稍後再試。',
        retry: '重試',
        noRecordings: '暫時未有錄音',
        showNotFound: '找不到此節目',
    },
    home: {
        title: '收聽節目',
        showsNav: '節目',
        today: '今日節目',
    },
    player: {
        nowPlaying: '正在播放',
        play: '播放',
        pause: '暫停',
        restart: '由頭播放',
        seekBack: '後退 {seconds} 秒',
        seekForward: '前進 {seconds} 秒',
        seekBackShort: '−{seconds}',
        seekForwardShort: '+{seconds}',
        progress: '播放進度',
        progressText: '{current} / {total}',
    },
    dates: {
        title: '日子',
        watched: '已收聽',
        label: '{day}/{month}（{weekday}）',
    },
    today: {
        title: '今日節目',
        listTitle: '今日節目',
        playShow: '播放 {name}',
        statusPlaying: '播放中',
        statusWatched: '已收聽',
        statusUnwatched: '未收聽',
    },
} as const;

/** 星期日至星期六，配合 Date#getUTCDay() */
export const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'] as const;
