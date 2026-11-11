/* 劇集 folder 掃描：FolderListing（本機 fs / R2 list）→ drama.json 草稿 + 問題清單 */
export { generateDraft } from './draft';
export { scanListing } from './listing';
export {
    byteOrder,
    findSuspicious,
    parseEpisodeFileName,
    parseEpisodeNumeral,
    type ParsedEpisodeFile,
} from './names';
export { exampleFileName } from './example';
export { DAILY_TEMPLATE, SERIES_TEMPLATES } from './shared';
export { coverUrls, episodeUrls } from './urls';
export type {
    ArcScan,
    ArcSummary,
    DraftArc,
    DraftJson,
    DraftKind,
    DraftOptions,
    DraftResult,
    DramaScan,
    FolderListing,
    Issue,
    IssueLevel,
} from './types';
