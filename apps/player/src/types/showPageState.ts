/** 入節目頁時帶嘅 history state：mini player 撳入嚟帶埋嗰項嘅 url，節目頁要跟返嗰集（S-507） */
export interface ShowPageState {
    url?: string;
}

/**
 * 由「我的收藏」撳行入節目頁 / 劇集頁（P7 #7）：focusId = 嗰集嘅穩定 episode ID
 * （同收藏 / 進度 storage 一樣用 id，S-743）。唔播（同 url 唔同），清單捲去嗰集、短暫 highlight
 */
export interface EpisodeFocusState {
    focusId?: string;
}
