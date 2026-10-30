/**
 * HTMLMediaElement.readyState 嘅 spec 值（jsdom 冇呢啲常數）。
 * 單一來源：src 判斷載入進展同 tests 嘅 FakeAudio 都用呢度（S-585）
 */
export const HAVE_NOTHING = 0;
/** 只有 header / 長度，冇任何可播數據 */
export const HAVE_METADATA = 1;
/** 有而家位置嘅數據 */
export const HAVE_CURRENT_DATA = 2;
/** 數據夠播一陣：spec 喺呢度先發 playing */
export const HAVE_FUTURE_DATA = 3;
export const HAVE_ENOUGH_DATA = 4;

/** HTMLMediaElement.networkState：揀咗來源、正喺網絡攞數據（CUI-0011） */
export const NETWORK_LOADING = 2;
