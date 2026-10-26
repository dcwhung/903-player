/** multi = 多段錄音（今日節目），頂有指示點；single = 得一段（例如廣播劇一集），冇指示點 */
export type MiniPlayerMode = 'single' | 'multi';

/**
 * 得一段（或者冇）錄音就冇指示點（PageDots 唔畫），mini player 唔使留指示點個位；
 * 主頁底部留位都跟住用矮啲嘅高度
 */
export const miniPlayerMode = (keys: readonly string[]): MiniPlayerMode =>
    keys.length <= 1 ? 'single' : 'multi';
