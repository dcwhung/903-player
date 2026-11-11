/*
 * 422 驗證錯誤（server 原文英文：「<kind>/<id>: <欄位> <原因>」，同 catalog parser 一套）→ 書面語中文。
 * 識嘅寫明邊樣有問題；唔識就回 null（畫面出一般訊息 + 可展開原文）
 */
import { t, type MessageKey } from '../../i18n/t';

const SOURCE = /^(shows|dramas)\/([^:]+): (.+)$/;
const ARC_PATH = /^arcs\[(\d+)\]\.?/;
const MISSING_IMAGE = /^(tile|disc): no file \S+ in the folder$/;
const FIELD_PROBLEM = /^(\w+)(?:\[\d+\])? must (.+)$/;
const EMPTY_REASON = /^(be a non-empty string|not be empty)$/;
const DATE_REASON = /^be a YYYY-MM-DD date$/;
const DUPLICATE_ARC_ID = /^id: duplicate arc id (\S+)$/;

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

export const validationMessage = (detail: string): string | null => {
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
