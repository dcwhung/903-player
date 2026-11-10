/*
 * 單一 entry 驗證：同 publish / player 同一套 validator（parseDramaDefinition / parseShowDefinition 經 registry），
 * 圖 manifest 同 publish 一樣要合 <hash>.<ext> 兼已上載（S-772）
 */
import { buildRegistry, buildShowRegistry, type CatalogKind } from '@903-player/catalog';
import { CATALOG_IMAGE_PATH, VALIDATION_BUILD_OPTIONS } from '../config';
import { resolveImages } from '../catalog/publish';

/** 422：definition / 圖唔合格（message 寫明邊個欄位） */
export class EntryValidationError extends Error {
    override readonly name = 'EntryValidationError';
}

export interface EntryInput {
    kind: CatalogKind;
    id: string;
    definition: Record<string, unknown>;
    images: Record<string, unknown>;
}

export interface ImageContext {
    origin: string;
    assets: ReadonlySet<string>;
}

export interface ValidateOptions {
    /**
     * draft（掃描自動建嘅劇）寬鬆驗證：definition 用到但未上載嘅圖當有（placeholder URL）；
     * 有上載嘅圖照驗 <hash>.<ext> + 已上載，其他規則一樣
     */
    relaxed?: boolean;
}

/** draft 未上載嘅圖：淨係畀 validator 當檔案存在，唔會入 catalog.json（publish 唔包 draft） */
const DRAFT_IMAGE_PLACEHOLDER = 'draft-placeholder.webp';

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

/** definition 用到嘅圖檔名（劇集 / 節目 tile、disc；短篇 disc、tile） */
const referencedImages = (definition: Record<string, unknown>): string[] => {
    const arcs = Array.isArray(definition.arcs) ? definition.arcs.filter(isRecord) : [];
    return [definition, ...arcs]
        .flatMap((node) => [node.tile, node.disc])
        .filter((file): file is string => typeof file === 'string');
};

const imageUrlsOf = (entry: EntryInput, context: ImageContext, relaxed: boolean) => {
    const urls = resolveImages(entry.images, `${entry.kind}/${entry.id}`, context);
    if (!relaxed) return urls;
    const placeholder = `${context.origin}${CATALOG_IMAGE_PATH}${DRAFT_IMAGE_PLACEHOLDER}`;
    const missing = referencedImages(entry.definition).filter((file) => !(file in urls));
    return { ...urls, ...Object.fromEntries(missing.map((file) => [file, placeholder])) };
};

const episodeIdsOf = (entry: EntryInput, context: ImageContext, relaxed: boolean) => {
    const { kind, id, definition } = entry;
    const where = `${kind}/${id}`;
    const urls = imageUrlsOf(entry, context, relaxed);
    const source = { folders: () => [{ id, source: where, definition, images: urls }] };
    if (kind === 'shows') {
        buildShowRegistry(source);
        return [];
    }
    const registry = buildRegistry(source, VALIDATION_BUILD_OPTIONS);
    return registry.catalogEpisodesOf(id).map((e) => e.id);
};

/**
 * 驗一個 entry；合格就回佢嘅 episode ID（節目冇）；唔合格 → EntryValidationError。
 * 同 publish 嘅 validateDocument 一樣：validator 拋乜都當唔合格（422）
 */
export const validateEntry = (
    entry: EntryInput,
    context: ImageContext,
    { relaxed = false }: ValidateOptions = {},
): string[] => {
    try {
        return episodeIdsOf(entry, context, relaxed);
    } catch (error) {
        throw new EntryValidationError(error instanceof Error ? error.message : String(error));
    }
};
