/*
 * 文案規則（用戶 2026-11-05 決定）：
 * - G1 空格：半形數字同中文之間有空格，全形括號後面冇空格（「05/12 下架」「05/12（六）下架」）
 * - 日子：畫面「17/10（六）」（dates.label）/「17/10」；讀屏一律「17/10 星期六」（dates.spoken），唔講明日 / 後日
 * - G2「·」分隔符：common.separator（前後有空格），code 砌字用佢，唔另外寫死
 * - G3 範圍一律用「至」：「第 11 至 20 集」
 * - 狀態字（播放中、已暫停、已收聽、未收聽、聽到…）只寫喺 common.status，各處引用同一個
 */
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
        // G2：「·」分隔符（前後有空格）
        separator: ' · ',
        // A4：清單行 / 收藏 tab / 今日節目表 / 全集表 / 把手共用嘅狀態字
        status: {
            playing: '播放中',
            // A2：「已暫停」只喺播放器同把手出；清單行暫停緊用 resumeOf
            paused: '已暫停',
            // A1：全 app 統一「已收聽」（唔再用「已聽完」）
            watched: '已收聽',
            unwatched: '未收聽',
            resume: '聽到 {time}',
            resumeOf: '聽到 {current} / {total}',
        },
    },
    home: {
        bannerAlt: '903 叱咤 Player：隨時隨地，音樂・節目・一click 即聽',
        showsNav: '節目',
        // 主頁橫額下面嘅分類 tab
        tabs: '分類',
        tabShows: '節目',
        tabDramas: '廣播劇',
        // 第三個 tab：淨係 ★ icon（有收藏先出）
        tabSaved: '我的收藏',
        // 第三個 tab：冇收藏但有收聽記錄時換做歷史 icon，成個 tab 係最近收聽
        tabRecent: '最近收聽',
        dramasNav: '廣播劇',
        today: '今日節目',
        // 節目格：今日有已上架、未聽完嘅新一集
        newBadge: '新',
        showNew: '{name}，今日有新一集',
        // 矮螢幕節目格分頁：指示點每粒嘅名、成組嘅位置
        page: '第 {index} 頁',
        pagePosition: '節目第 {index} 頁，共 {total} 頁',
    },
    player: {
        play: '播放',
        pause: '暫停',
        restart: '由頭播放',
        progress: '播放進度',
        progressText: '{current} / {total}',
        // 未載到 metadata 時，進度弧右邊嘅總長度佔位
        unknownDuration: '--:--',
    },
    dates: {
        title: '日子',
        label: '{day}/{month}（{weekday}）',
        dayMonth: '{day}/{month}',
        weekday: '星期{weekday}',
        // 讀屏版日子：「17/10 星期六」（dayMonth + 空格 + weekday）
        spoken: '{dayMonth} {weekday}',
    },
    episodes: {
        title: '集數',
        count: '共 {count} 集',
        // 有未上架集數：「共 N 集」只計播得到嘅
        countWithUnavailable: '共 {count} 集 · {unavailable} 集未上架',
        // 試過但原站未有（404）：行照列出但撳唔到
        unavailable: '未上架',
        // 節目頁：有未上架集數但一集都播唔到
        noneUp: '未有集數上架',
        playing: '播放中 · {current} / {total}',
        // 揀中嗰集載入咗未開始（暫停緊就寫 common.status.resumeOf，A2）
        ready: '未開始 · {current} / {total}',
        play: '播放 {date}，{status}',
        // 播緊嗰集：清單行嘅掣變暫停
        pause: '暫停 {date}，{status}',
        // 節目頁唱片下面嘅日子條：左右滑動（或者方向鍵）轉集
        switchHint: '左右方向鍵或左右滑動轉集',
        switchRoleDescription: '轉集',
        switched: '已轉到 {date}',
        // 日子條上面嘅標籤（強調色），現正播放嗰日喺條正中
        nowPlayingLabel: '現正播放',
        // 未讀到時長（例如斷網）：標籤同揀中集狀態都顯示呢個，唔顯示時間
        connecting: '連線中…',
        // 橫版唱片下面嗰行（節目頁 / 今日節目頁 / 廣播劇播放頁）
        nowPlayingLine: '現正播放：{label}',
        // 廣播劇頁：聽到一半暫停 / 揀短篇載入咗未開始
        pausedLine: '已暫停：{label}',
        readyLine: '下一集：{label}',
        // 日子條入面有集數嘅日子（撳落去播嗰集；同集數清單「播放 …」分開）
        pickDay: '轉去 {date}',
    },
    miniPlayer: {
        region: '正在播放（今日節目）',
        regionDrama: '正在播放（廣播劇）',
        open: '開啟 {name} 節目頁',
        openDrama: '開啟 {name} 廣播劇頁',
        withTime: '{label} · {time}',
        position: '今日第 {index} 個節目，共 {total} 個',
        // 聽緊嘅舊集排喺今日節目前面（重溫）：成個播放器（今日冇節目就只有重溫）、開頁掣、指示點、第幾個嘅讀屏名
        regionRewatch: '正在播放（重溫及今日節目）',
        regionRewatchOnly: '正在播放（重溫）',
        openRewatch: '開啟 {name} 節目頁，重溫 {date}',
        rewatchDot: '{name}，重溫 {date}',
        positionRewatch: '第 {index} 個節目，共 {total} 個',
        // 長按浮起後副題換做提示；左滑露出嘅掣；讀屏 / 鍵盤用嘅關閉掣
        dismissHint: '‹‹ 滑動關閉',
        dismissAction: '關閉',
        dismissLabel: '關閉播放器',
        // 節目名旁邊嘅細標籤（MiniPlayerTag）
        tag: {
            rewatch: '重溫',
            today: '今日',
        },
    },
    // 成集收藏（P7 #7，_mockups_/bookmark）
    bookmark: {
        // 集數清單每行嘅 ☆ / ★（aria-pressed 講收藏咗未）
        toggleEpisode: '收藏 {label}',
        // 播放器播放掣右邊
        toggleCurrent: '收藏本集',
        added: '已加入收藏',
        removed: '已移除收藏',
        // 收藏 tab 每行（狀態字見 common.status）；{label} 係讀屏日子「17/10 星期六」或者「第 N 集」
        // B3：短篇劇名「芝See菇Bi Family · 三十六計」（{sep} = common.separator）
        seriesName: '{title}{sep}{arc}',
        open: '開啟 {name} {label}，{status}',
        play: '播放 {name} {label}',
        pause: '暫停 {name} {label}',
        // 左滑移除嘅鍵盤代替（撳 Delete）
        removeHint: '向左掃或者撳 Delete 移除收藏',
        recent: '最近收聽',
        openRecent: '開啟 {name} {label}',
        bookmarkRecent: '收藏 {name} {label}',
    },
    // 闊橫版主頁右邊播放卡（HomePlayerCard）同收埋後右邊嘅把手
    homeCard: {
        // 把手出現 = 撳咗 ✕ 停咗播（useHomeCardToggle），所以名入面講埋狀態
        reopen: '已暫停：{name}，打開播放器',
    },
    // 闊橫版內頁右邊把手（InnerPageHandle）：播緊 / 暫停緊其他節目 / 劇集，撳 = 返主頁
    pageHandle: {
        playing: '播放中：{name}，返回主頁',
        paused: '已暫停：{name}，返回主頁',
    },
    cardStack: {
        label: '今日節目，左右滑動轉節目',
        roleDescription: '節目卡疊',
    },
    today: {
        title: '今日節目',
        listTitle: '節目表',
        playShow: '播放 {name}',
        playShowWithStatus: '播放 {name}，{status}',
        pauseShowWithStatus: '暫停 {name}，{status}',
        timeWithStatus: '{time} · {status}',
        statusUnavailable: '未上架',
        unavailableCount: '{count} 個未上架',
        // 橫版唱片下面「現正播放：21/10（三）· 第 3 / 5 個節目」
        nowPlayingIndex: '{date} · 第 {no} / {total} 個節目',
        // 今日有節目播但一個都未上架：卡疊嘅位改為呢個空狀態
        emptyTitle: '今日節目未上架',
        emptyHint: '上架之後會自動顯示',
    },
    drama: {
        notFound: '找不到此廣播劇',
        // 主頁劇集格右下角
        arcCount: '{count} 個短篇',
        seasonCount: '全 {count} 季',
        daily: '每日更新',
        // 主頁劇集格底部（聽過先出）
        continue: '繼續收聽',
        tileContinue: '{name}，繼續收聽 {label}',
        // 劇集格左上角「新」嘅讀屏
        tileNew: '{name}，{label}',
        newArc: '有新短篇',
        // 成套劇一齊上架（全部短篇 / 季都新）
        newDrama: '新上架',
        newEpisode: '今日有新一集',
        // 短篇劇集：清單每行細字、mini player / 鎖屏副標題
        episodeNo: '第 {no} 集',
        seriesLabel: '{arc} · 第 {no} 集 · {title}',
        // 冇集名嘅集數
        seriesLabelUntitled: '{arc} · 第 {no} 集',
        // 每日劇集重播舊集
        rerun: '重溫',
        dailyRerunLabel: '{date} · 重溫',
        // 短篇劇集頁：唱片下面嘅短篇 chips
        arcs: '短篇',
        // 睇緊其他短篇時，播緊嗰個短篇嘅 chip
        arcPlaying: '播緊',
        // 全集一覽表（chips 最前「☰ 全集」打開）
        allArcs: '全集',
        // chip 上「新」嘅讀屏說明
        arcNewLabel: '新上架',
        sheetTitle: '全集',
        // 「播放中」/「已收聽」兩組用 common.status
        groupNew: '新上架',
        groupUnfinished: '未聽完',
        sheetDone: '聽完 {done} / {total} 個',
        sheetClose: '關閉',
        arcPlayingEpisode: '播緊第 {no} 集',
        arcResumeAt: '聽到第 {no} 集 {time}',
        arcNext: '下一集係第 {no} 集',
        // 短篇劇集頁未載入呢套劇（第一次入未揀，或者播緊其他嘢）：唱片下面 / chips 上面嗰行
        pickArcToStart: '揀一個短篇開始收聽',
        // 聽過但未載入（入頁唔自動播，或者播緊其他嘢）：撳播放會繼續收聽嗰集
        continueLine: '繼續收聽：{label}',
        arcNew: '未聽 · {count} 集',
        arcDone: '聽完 · {count} 集',
        arcRow: '{arc}，{status}',
        // 行嘅讀屏名加埋聽完幾多（畫面上係碟面下面嘅「1/4」）
        arcWatchedCount: '聽完 {watched} / {total} 集',
        arcPlayNew: '播放 {arc} 第 1 集',
        arcPlayResume: '續聽 {arc} 第 {no} 集',
        arcPlayAgain: '由第 1 集重聽 {arc}',
        arcPause: '暫停 {arc}',
        arcPlay: '播放 {arc}',
        nowPlayingShort: '第 {no} 集 · {title}',
        // 直版 chips 上面「現正播放：好朋友手牽手 · 第 2 集 集名」
        nowPlayingArcShort: '{arc} · {episode}',
        // 橫版唱片下面「現正播放：好朋友手牽手 · 第 2 / 4 集」（下一行集名）
        nowPlayingArc: '{arc} · 第 {no} / {total} 集',
    },
} as const;

/** 星期日至星期六，配合 Date#getUTCDay() */
export const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'] as const;
