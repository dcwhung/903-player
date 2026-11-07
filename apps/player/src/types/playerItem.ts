import type { DramaId } from './drama';
import type { ShowId } from './recording';

/**
 * 播緊 / 閂咗嘅係邊個節目 / 劇集：內頁把手（pageHandle）用嚟判斷係咪呢頁自己嘅嘢。
 * 節目連埋日子：今日節目頁只當今日嘅錄音係自己嘅
 */
export type PlayerItem =
    { kind: 'show'; id: ShowId; date: string } | { kind: 'drama'; id: DramaId };
