/*
 * 改劇集 ID 時短篇 ID 點跟（api 改名同 admin 儲存共用，唯一一份）：
 * 掃描跟劇 ID 自動編號嘅短篇 ID（<舊劇 ID>-NN，見 merge.ts withArcIds）改做 <新劇 ID>-NN；其他 ID 唔郁
 */
import { PLACEHOLDER_ARC_WIDTH } from './merge';

/** 自動編號短篇 ID 嘅尾：-NN（闊度同 withArcIds 派嘅一樣） */
const AUTO_ARC_SUFFIX = new RegExp(`^-\\d{${PLACEHOLDER_ARC_WIDTH}}$`);

type RawJson = Record<string, unknown>;

const isRawRecord = (value: unknown): value is RawJson =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

/** <from>-NN → <to>-NN；其他 ID 唔郁 */
export const renamedArcId = (arcId: string, from: string, to: string): string =>
    arcId.startsWith(from) && AUTO_ARC_SUFFIX.test(arcId.slice(from.length))
        ? `${to}${arcId.slice(from.length)}`
        : arcId;

/** definition 入面每個短篇嘅 id 照 renamedArcId 改；冇 arcs list 就原樣奉還 */
export const withRenamedArcIds = (definition: RawJson, from: string, to: string): RawJson =>
    Array.isArray(definition.arcs)
        ? {
              ...definition,
              arcs: (definition.arcs as unknown[]).map((arc) =>
                  isRawRecord(arc) && typeof arc.id === 'string'
                      ? { ...arc, id: renamedArcId(arc.id, from, to) }
                      : arc,
              ),
          }
        : definition;
