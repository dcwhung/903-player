/*
 * visualModel.mjs 嘅型別（只畀 repo 入面嘅 TypeScript test 用）。
 */
export type ViewportKind =
    'phone-portrait' | 'phone-landscape' | 'tablet-portrait' | 'tablet-landscape' | 'desktop';

export interface VisualViewport {
    id: string;
    kind: ViewportKind;
    width: number;
    height: number;
    touch: boolean;
}

export const VISUAL_VIEWPORTS: readonly VisualViewport[];
export const GEOMETRY_REPORT_LIMIT: number;

export const VISUAL_TIMEZONE: string;
export const VISUAL_DAY_NOW: string;

export function dayScenes<S extends { id: string; now?: string }>(
    scenes: readonly S[],
    ids: readonly string[],
    now: string,
): (S & { now: string })[];

export function shotName(sceneId: string, viewport: { id: string }): string;

export interface VisualFilter {
    scenes: string[];
    viewports: string[];
}

export function selectShots<S extends { id: string }, V extends { id: string }>(
    scenes: readonly S[],
    viewports: readonly V[],
    filter: VisualFilter,
): { name: string; scene: S; viewport: V }[];

export interface VisualArgs extends VisualFilter {
    base: string | undefined;
    keepWorktree: boolean;
}

export function parseVisualArgs(
    argv: readonly string[],
    env: Record<string, string | undefined>,
): VisualArgs;

export const VERSION_TEXT: RegExp;
export const VERSION_PLACEHOLDER: string;
export function normalizeVersionText(text: string): string;

export interface GeometryItem {
    key: string;
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface GeometryDiff {
    index: number;
    base: GeometryItem | null;
    head: GeometryItem | null;
}

export function diffGeometry(
    base: readonly GeometryItem[],
    head: readonly GeometryItem[],
): GeometryDiff[];

export interface ShotResult {
    name: string;
    pixels: number;
    geometry: GeometryDiff[];
}

export function summarize(results: readonly ShotResult[]): { ok: boolean; lines: string[] };
