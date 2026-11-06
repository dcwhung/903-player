/** 一覽表行嘅上架 / 下架補充（P8 #6，_mockups_/coming-soon ⑥ A2、⑧ LS2）；冇就同以前一樣 */
export interface ArcRowNotes {
    /** 膠囊分母：有未上架批次就計埋全部集數（A2「0/30」） */
    total?: number | undefined;
    /** 取代狀態字（聽晒已上架嘅集數：「聽到第 10 集」） */
    status?: string | undefined;
    /** 狀態字後面加嘅（「第 11 集起 19/11 上架」、「05/12 下架」），用「 · 」接 */
    suffixes: readonly string[];
    /** 讀屏版（讀屏日子，F2）：同 suffixes 一一對應 */
    spokenSuffixes: readonly string[];
    /** 名後面嘅琥珀膠囊（「快將下架」/「部分快將下架」） */
    badge?: string | undefined;
}

/** 「即將上架」組一行（S1）：撳唔到、右邊冇播放掣 */
export interface UpcomingArcRowView {
    arc: string;
    cover: string;
    /** 碟面底膠囊：上架日短版（「12/11」/「明日」） */
    pill: string;
    /** 第二行：「12/11（四）上架 · 20 集」；集數未知就淨係日子 */
    status: string;
    /** 讀屏：「XXX，12/11 星期四 上架，20 集」 */
    label: string;
}
