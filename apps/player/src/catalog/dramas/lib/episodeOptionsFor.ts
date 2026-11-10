/*
 * Player 展開集數用嘅設定，由 base path 計（唔讀 import.meta.env）：
 * runtime 經 episodeOptions.ts 用 Vite BASE_URL；prebuild snapshot（scripts/catalogSnapshot.ts，喺 Vite 外面跑）
 * 由 vite.config 傳 base path 入嚟，驗證 catalog.json 時同 player runtime 用同一套
 */
import type { EpisodeBuildOptions } from '@903-player/catalog';

/** host: app 嘅錄音放喺 app 自己 public/dramas/<folder>/ */
const APP_AUDIO_DIR = 'dramas/';

export const episodeOptionsFor = (baseUrl: string): EpisodeBuildOptions => ({
    appAudioBase: `${baseUrl}${APP_AUDIO_DIR}`,
});
