/*
 * 廣播劇集數。
 * - 芝See菇Bi Family：真清單（12 個短篇、97 集），錄音喺 Cloudflare R2
 *   （DRAMA_AUDIO_BASE/芝See菇Bi Family/<短篇>/<原檔名>）。
 * - 18 樓 C 座：⚠️ 仲係假資料（由截圖抄嘅日子），網址係佔位（public/dramas/c18/），
 *   撳播放會一直「連線中…」；等 manifest 到咗先換。介面（dramaEpisodesOf 等）唔使變。
 */
import { DRAMA_AUDIO_BASE } from '../config/constants';
import type { DailyEpisode, DramaEpisode, DramaId, SeriesEpisode } from '../types/drama';

/** 路徑每一段都 encode（空格、中文、全形字） */
const encodePath = (segments: readonly string[]): string =>
    segments.map(encodeURIComponent).join('/');

/** R2 入面芝See 嘅 folder（同畫面顯示嘅劇名一樣） */
const CHISEE_FOLDER = '芝See菇Bi Family';

/** 檔名入面嘅集數用中文數字（第零集、第一集 … 第十集 … 第三十六集） */
const CHINESE_DIGITS = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'] as const;
const CHINESE_ZERO = '零';
const CHINESE_TEN = '十';
const TEN = 10;
const FILE_NO_WIDTH = 2;

/** 0–99 → 中文數字（0 →「零」、10 →「十」、12 →「十二」、20 →「二十」、36 →「三十六」） */
export const toChineseNumeral = (n: number): string => {
    if (n === 0) return CHINESE_ZERO;
    const tens = Math.floor(n / TEN);
    const ones = n % TEN;
    if (tens === 0) return CHINESE_DIGITS[ones] ?? String(n);
    const tensPart = tens === 1 ? CHINESE_TEN : `${CHINESE_DIGITS[tens] ?? ''}${CHINESE_TEN}`;
    return `${tensPart}${CHINESE_DIGITS[ones] ?? ''}`;
};

/** 檔名入面集名「計名 _ 副題」嘅分隔（檔名唔用得「：」），畫面顯示換返做「：」 */
const FILE_TITLE_SEPARATOR = ' _ ';
const DISPLAY_TITLE_SEPARATOR = '：';

/** 畫面顯示嘅集名：分隔換「：」，去頭尾空格 */
const displayTitle = (fileTitle: string): string =>
    fileTitle.replaceAll(FILE_TITLE_SEPARATOR, DISPLAY_TITLE_SEPARATOR).trim();

/**
 * 原檔名：「01 - 短篇名 - 第一集.m4a」，有集名就加「 - 集名」
 * （例如「04 - Ｘ時mas時小提議 - 第四集 - 認認真真搵返個人.m4a」）
 */
const chiseeFile = (arc: string, no: number, title: string | undefined): string =>
    [
        String(no).padStart(FILE_NO_WIDTH, '0'),
        arc,
        `第${toChineseNumeral(no)}集`,
        ...(title ? [title] : []),
    ].join(' - ') + '.m4a';

/** 初戀嗱喳麵：前傳之後、後傳之前，第一至二十集冇集名 */
const CHULUEN_UNTITLED_EPISODES = 20;

/**
 * 芝See菇Bi Family 短篇（按短篇名字碼排，新短篇照排入去）：每集嘅集名，冇集名係 null。
 * 短篇名 = R2 folder 名 = 檔名入面嘅名，照原寫法（全形「Ｘ」、「游亁水」、「青春期眞神奇」）。
 * 集名照原檔名寫（包括「 _ 」），顯示時先由 displayTitle 執靚。
 * 有「第零集」（前傳）嘅短篇寫 firstNo: 0；冇寫就由第 1 集起。
 * 新加短篇要寫 addedAt（上架日子 YYYY-MM-DD），上架 14 日內會出「新」；
 * 原本嗰 10 個係舊短篇，唔寫
 */
const CHISEE_ARCS: readonly {
    arc: string;
    addedAt?: string;
    firstNo?: number;
    titles: readonly (string | null)[];
}[] = [
    {
        arc: '三十六計',
        addedAt: '2026-10-24',
        titles: [
            '瞞天過海 _ 隠形墨水筆',
            '無中生有 _ 你騙我騙你',
            '聲東擊西 _ 突擊檢查大作戰',
            '順手牽羊 _ 一代橋王苦榮',
            '反客為主 _ 臭爆插班生亞沙',
            '拋磚引玉 _ 看透一切的維園呀伯',
            '笑裡藏刀 _ 小學雞大報仇',
            '反間計 _ 手掌, 手背, 反轉再反轉都係肉',
            '樹上開花 _ IFC 鬥智大比拼',
            '以逸待勞 _ 智取亞生成績表',
            '假途伐虢 _ 英雄本色',
            '空城計 _ 晶晶和亞偉',
            '指桑罵槐 _ 談真誠 VS 講大話',
            '借屍還魂 _ 男女互氹大比賽',
            '假痴不癲 _ 他和她的秘密',
            '圍魏救趙 _ 感動浪漫的一天',
            '美人計 _ 小姐你係邊位？',
            '上屋抽梯 _ 消聲匿跡愛一天',
            '遠交近攻 _ 被煽動的賽果',
            '隔岸觀火 _ 當堂... 當堂咩嘢都變晒',
            '走為上計 _ 好憎講大話既自己',
            '李代桃僵 _ 義氣女兒小苦妹',
            '暗渡陳倉 _ 危險的冤枉路',
            '調虎離山 _ 亞沙握手成功, 苦榮命途難料',
            '趁火打劫 _ 生死未卜的苦榮',
            '混水摸魚 _ 潛入北京舞蹈學園',
            '釜底抽薪 _ 咩都冇晒既老千',
            '吊著條癮 _ 沙, 我愛你',
            '那年秋天 _ 林狗與當堂',
            '真相大白 _ 林狗的愛情故事',
            '團結力量 _ 對付老千大佬謝賢',
            '拋磚引玉 + 欲擒先縱 _ 拳賽大騙局',
            '打草驚蛇 _ 大老千, 落搭吧!',
            '苦肉計 _ 總動員, 努力做場好 Show!!',
            '連環計 _ 弱肉強食皇者無敵',
            '偷樑換柱 + 金蟬脫殼 + 擒賊擒王 _ 完美的結局',
        ],
    },
    { arc: '你生日所以我生日', titles: [null, null, null] },
    {
        arc: '初戀嗱喳麵',
        addedAt: '2026-10-25',
        firstNo: 0,
        titles: [
            '前傳',
            ...Array<null>(CHULUEN_UNTITLED_EPISODES).fill(null),
            '後傳1',
            '後傳2',
            '後傳3',
            '後傳4',
            '後傳5',
        ],
    },
    { arc: '大妒忌', titles: [null, null, null] },
    { arc: '好朋友手牽手', titles: ['好傾朋友', '朋友不同', '朋友性別', '朋友第一'] },
    { arc: '小苦妹撲水', titles: [null, null, null, null] },
    { arc: '我們都在會考中成長', titles: ['能源的故事', '舊底的故事'] },
    { arc: '游亁水', titles: [null, null, null, null] },
    { arc: '苦榮去做GYM', titles: [null, null, null, null] },
    { arc: '青春期', titles: [null, null, null, null] },
    { arc: '青春期眞神奇', titles: ['男女先後', '多少問題', '時間長短'] },
    {
        arc: 'Ｘ時mas時小提議',
        titles: ['不如休養下', '哥哥你洽我', '著襪索腳汗', '認認真真搵返個人'],
    },
];

const chiseeEpisodes = (): SeriesEpisode[] =>
    CHISEE_ARCS.flatMap(({ arc, addedAt, firstNo = 1, titles }) =>
        titles.map((title, i): SeriesEpisode => {
            const no = i + firstNo;
            return {
                kind: 'series',
                dramaId: 'chisee',
                url: `${DRAMA_AUDIO_BASE}/${encodePath([
                    CHISEE_FOLDER,
                    arc,
                    chiseeFile(arc, no, title ?? undefined),
                ])}`,
                arc,
                no,
                ...(title ? { title: displayTitle(title) } : {}),
                ...(addedAt ? { addedAt } : {}),
            };
        }),
    );

/** 截圖見到嘅日子；2025-08 嗰幾集係重播 */
const C18_EPISODES: readonly { date: string; rerun?: boolean }[] = [
    { date: '2026-10-23' },
    { date: '2026-10-22' },
    { date: '2026-10-21' },
    { date: '2026-10-20' },
    { date: '2026-10-16' },
    { date: '2026-10-15' },
    { date: '2025-08-13', rerun: true },
    { date: '2025-08-12', rerun: true },
    { date: '2025-08-11', rerun: true },
];

const c18Episodes = (): DailyEpisode[] =>
    C18_EPISODES.map(({ date, rerun = false }) => ({
        kind: 'daily',
        dramaId: 'c18',
        url: `${import.meta.env.BASE_URL}dramas/c18/${date.replaceAll('-', '')}.m4a`,
        date,
        rerun,
    }));

const CATALOG: Readonly<Record<DramaId, readonly DramaEpisode[]>> = {
    chisee: chiseeEpisodes(),
    c18: c18Episodes(),
};

/** 某套劇全部集數（短篇劇集按短篇 → 集數排；每日劇集次序唔保證，用 dailyNewestFirst 排） */
export const dramaEpisodesOf = (dramaId: DramaId): readonly DramaEpisode[] => CATALOG[dramaId];

export const seriesEpisodesOf = (dramaId: DramaId): SeriesEpisode[] =>
    dramaEpisodesOf(dramaId).filter((e): e is SeriesEpisode => e.kind === 'series');

export const dailyEpisodesOf = (dramaId: DramaId): DailyEpisode[] =>
    dramaEpisodesOf(dramaId).filter((e): e is DailyEpisode => e.kind === 'daily');
