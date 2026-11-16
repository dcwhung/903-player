/*
 * 422 驗證錯誤（server 原文英文：「<kind>/<id>: <欄位> <原因>」，同 catalog parser 一套；
 * 排程下架日衝突係「episode N unlist date … must be later than its listing date …」；
 * admin 自己擋嘅「episode N / episodes A-B unlist date … is before today …」（W-715、S-843））→ 書面語中文。
 * 首頁 Banner（api publish resolveImages「banner: image <slot> → <name> not uploaded / is not <hash>.<ext>」、
 * catalog parser「catalog.json: banner.<slot> must …」）→「首頁 Banner 不完整：…」。
 * 識嘅寫明邊樣有問題；唔識就回 null（畫面出一般訊息 + 可展開原文）
 */
import { t, type MessageKey } from '../../i18n/t';
import { shortDate } from '../../model/dates';
import { SLOT_SIZES, sizeLabel } from '../../ui/imageUpload';

const SOURCE = /^(shows|dramas)\/([^:]+): (.+)$/;
const ARC_PATH = /^arcs\[(\d+)\]\.?/;
const MISSING_IMAGE = /^(tile|disc): no file \S+ in the folder$/;
const FIELD_PROBLEM = /^(\w+)(?:\[\d+\])? must (.+)$/;
const EMPTY_REASON = /^(be a non-empty string|not be empty)$/;
const DATE_REASON = /^be a YYYY-MM-DD date$/;
const DUPLICATE_ARC_ID = /^id: duplicate arc id (\S+)$/;
/** 排程 422（packages/catalog expandSchedule）：某集下架日唔遲過上架日 */
const UNLIST_BEFORE_LISTING =
    /^episode (\d+) unlist date (\S+) must be later than its listing date (\S+)$/;
/** admin 儲存前（saveProblemOf，W-715）：某集 / 一段集數（S-843）新排嘅下架日早過今日 */
const UNLIST_BEFORE_TODAY = /^episodes? (\d+)(?:-(\d+))? unlist date (\S+) is before today \S+$/;

/** 任何講首頁 Banner 嘅錯誤（包括認唔到嘅）：publish 頁加「前往 Banner 頁」 */
const BANNER_PROBLEM = /^(?:catalog\.json: )?banner\b/;
const BANNER_NOT_UPLOADED = /^banner: image (standard|long) → \S+ not uploaded$/;
const BANNER_INVALID =
    /^(?:banner: image (standard|long) → \S+ is not <hash>\.<ext>|catalog\.json: banner\.(standard|long) must .+)$/;

/** 欄位 → 畫面標籤（fields.*，同編輯頁一樣） */
const FIELD_LABELS: Record<string, MessageKey> = {
    name: 'fields.name',
    summary: 'fields.summary',
    airDays: 'fields.airDays',
    airTime: 'fields.airTime',
    hosts: 'fields.hosts',
    kind: 'fields.kind',
    displayName: 'fields.displayName',
    cast: 'fields.cast',
    titles: 'fields.titles',
    fileTime: 'fields.fileTime',
    addedAt: 'fields.addedAt',
    removedAt: 'fields.removedAt',
};

/** 「節目「abc」」/「廣播劇「x」第 2 個短篇」 + 餘下嘅原因 */
const whereOf = (kind: string, id: string, message: string) => {
    const entity = t(kind === 'shows' ? 'validation.show' : 'validation.drama', { id });
    const arc = ARC_PATH.exec(message);
    if (!arc) return { entity, owner: entity, rest: message };
    const owner = t('validation.arc', { entity, no: Number(arc[1]) + 1 });
    return { entity, owner, rest: message.slice(arc[0].length) };
};

const fieldMessage = (owner: string, field: string, reason: string): string | null => {
    const label = FIELD_LABELS[field];
    if (!label) return null;
    if (EMPTY_REASON.test(reason)) return t('validation.empty', { owner, field: t(label) });
    if (DATE_REASON.test(reason)) return t('validation.badDate', { owner, field: t(label) });
    return t('validation.invalidField', { owner, field: t(label) });
};

const pastMessage = ([, first = '', last, removed = '']: RegExpExecArray): string =>
    last === undefined
        ? t('validation.unlistBeforeToday', { no: Number(first), removed: shortDate(removed) })
        : t('validation.unlistBeforeTodayRange', {
              first: Number(first),
              last: Number(last),
              removed: shortDate(removed),
          });

export const isBannerProblem = (detail: string): boolean => BANNER_PROBLEM.test(detail.trim());

/** banner 邊一張（standard / long）→「闊版（2000 × 400）」嘅參數 */
const bannerSlotOf = (slot: string) =>
    slot === 'long'
        ? { slot: t('validation.bannerLong'), size: sizeLabel(SLOT_SIZES.bannerLong) }
        : { slot: t('validation.bannerStandard'), size: sizeLabel(SLOT_SIZES.bannerStandard) };

const bannerMessage = (detail: string): string | null => {
    const missing = BANNER_NOT_UPLOADED.exec(detail);
    if (missing) return t('validation.bannerMissing', bannerSlotOf(missing[1] ?? ''));
    const invalid = BANNER_INVALID.exec(detail);
    if (!invalid) return null;
    return t('validation.bannerInvalid', bannerSlotOf(invalid[1] ?? invalid[2] ?? ''));
};

export const validationMessage = (detail: string): string | null => {
    if (isBannerProblem(detail)) return bannerMessage(detail.trim());
    const unlist = UNLIST_BEFORE_LISTING.exec(detail.trim());
    if (unlist)
        return t('validation.unlistBeforeListing', {
            no: Number(unlist[1]),
            removed: shortDate(unlist[2] ?? ''),
            listed: shortDate(unlist[3] ?? ''),
        });
    const past = UNLIST_BEFORE_TODAY.exec(detail.trim());
    if (past) return pastMessage(past);
    const source = SOURCE.exec(detail.trim());
    if (!source) return null;
    const { entity, owner, rest } = whereOf(source[1] ?? '', source[2] ?? '', source[3] ?? '');
    const image = MISSING_IMAGE.exec(rest);
    if (image)
        return t(image[1] === 'tile' ? 'validation.missingTile' : 'validation.missingDisc', {
            owner,
        });
    const duplicate = DUPLICATE_ARC_ID.exec(rest);
    if (duplicate) return t('validation.duplicateArcId', { entity, id: duplicate[1] ?? '' });
    const field = FIELD_PROBLEM.exec(rest);
    return field ? fieldMessage(owner, field[1] ?? '', field[2] ?? '') : null;
};
