/*
 * 單一 entry 驗證：同 publish / player 同一套 validator（parseDramaDefinition / parseShowDefinition 經 registry），
 * 圖 manifest 同 publish 一樣要合 <hash>.<ext> 兼已上載（S-772）
 */
import { buildRegistry, buildShowRegistry, type CatalogKind } from '@903-player/catalog';
import { VALIDATION_APP_AUDIO_BASE } from '../config';
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

const episodeIdsOf = ({ kind, id, definition, images }: EntryInput, context: ImageContext) => {
    const where = `${kind}/${id}`;
    const urls = resolveImages(images, where, context);
    const source = { folders: () => [{ id, source: where, definition, images: urls }] };
    if (kind === 'shows') {
        buildShowRegistry(source);
        return [];
    }
    const registry = buildRegistry(source, { appAudioBase: VALIDATION_APP_AUDIO_BASE });
    return registry.catalogEpisodesOf(id).map((e) => e.id);
};

/**
 * 驗一個 entry；合格就回佢嘅 episode ID（節目冇）；唔合格 → EntryValidationError。
 * 同 publish 嘅 validateDocument 一樣：validator 拋乜都當唔合格（422）
 */
export const validateEntry = (entry: EntryInput, context: ImageContext): string[] => {
    try {
        return episodeIdsOf(entry, context);
    } catch (error) {
        throw new EntryValidationError(error instanceof Error ? error.message : String(error));
    }
};
