/* admin / api 共用嘅純邏輯（Phase 3）：播放時間、各集標題 textarea、變更摘要、排程批次對比 */
export {
    AIR_TIME_MAX_HOURS,
    AIR_TIME_PATTERN_SOURCE,
    airTimeProblem,
    formatAirDays,
    formatAirTime,
    type AirTime,
} from './airTime';
export {
    batchesOf,
    compareBatches,
    type ArcSchedule,
    type ArcSpan,
    type BatchComparison,
} from './batches';
export { summarizeChanges } from './changes';
export { arcImageFile, entryImageFile, IMAGE_SLOTS } from './editChanges';
export { arcIdOf } from './rawDefinition';
export type {
    ChangeArcRef,
    ChangeDetail,
    ChangeDocument,
    ChangeEntryRef,
    ChangeItem,
    ChangeKind,
    ChangeSummary,
    ChangeTimelineGroup,
    ChangeWhen,
    SummarizeOptions,
    UnlistReason,
} from './changeTypes';
export {
    formatTitleLine,
    formatTitles,
    parseTitles,
    type ParsedTitles,
    type TitledArc,
    type TitleError,
    type TitleErrorKind,
} from './episodeTitles';
