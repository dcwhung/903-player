/*
 * Player 展開集數用嘅設定（@903-player/catalog 唔讀 import.meta.env，由呢度注入）：
 * host: app 嘅錄音放喺 app 自己 public/dramas/<folder>/，跟 Vite BASE_URL（Vercel `/`、GitHub Pages `/903-player/`）
 */
import type { EpisodeBuildOptions } from '@903-player/catalog';

const APP_AUDIO_DIR = 'dramas/';

export const PLAYER_EPISODE_OPTIONS: EpisodeBuildOptions = {
    appAudioBase: `${import.meta.env.BASE_URL}${APP_AUDIO_DIR}`,
};
