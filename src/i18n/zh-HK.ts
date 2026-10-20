export const zhHK = {
    app: {
        version: 'v{version}',
        versionLabel: '版本 {version}',
    },
    common: {
        back: '返回主頁',
        loading: '載入中…',
        retry: '重試',
        searching: '搵緊最新錄音…',
        noRecordings: '暫時未有錄音',
        showNotFound: '找不到此節目',
    },
    home: {
        bannerAlt: '903 叱咤 Player：隨時隨地，音樂・節目・一click 即聽',
        showsNav: '節目',
        today: '今日節目',
    },
    player: {
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
        dayMonth: '{day}/{month}',
        weekday: '星期{weekday}',
    },
    episodes: {
        title: '集數',
        count: '共 {count} 集',
        playing: '播放中 · {current} / {total}',
        resume: '聽到 {time}',
        watched: '已收聽',
        unwatched: '未收聽',
        play: '播放 {date}，{status}',
        // 節目頁唱片下面嘅日子條：左右掃（或者方向鍵）轉集
        switchHint: '左右方向鍵或左右掃動轉集',
        switchRoleDescription: '轉集',
        switched: '已轉到 {date}',
        // 日子條中間：「現正播放：16/10（五）」，標籤用強調色
        nowPlayingLabel: '現正播放：',
        // 日子條兩邊：左邊新一集、右邊舊一集（可見文字 + 讀屏軟件讀嘅名）
        newerChevron: '‹',
        olderChevron: '›',
        newer: '新一集 {date}',
        older: '舊一集 {date}',
    },
    miniPlayer: {
        region: '正在播放（今日節目）',
        open: '開啟 {name} 節目頁',
        today: '今日 {date}',
        withTime: '{label} · {time}',
        position: '今日第 {index} 個節目，共 {total} 個',
    },
    cardStack: {
        label: '今日節目，左右掃動轉節目',
        roleDescription: '節目卡疊',
    },
    today: {
        title: '今日節目',
        listTitle: '今日節目',
        playShow: '播放 {name}',
        playShowWithStatus: '播放 {name}，{status}',
        timeWithStatus: '{time} · {status}',
        statusPlaying: '播放中',
        statusWatched: '已收聽',
        statusUnwatched: '未收聽',
    },
} as const;

/** 星期日至星期六，配合 Date#getUTCDay() */
export const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'] as const;
