/*
 * theme 色值 #rrggbb（S-892）：reader（themeSchema readHex 驗證）同 theme/contrast（計亮度）共用一條，
 * 唔好兩邊各自寫。三個 capture group = r / g / b（驗證只用 test，唔理 group）
 */
export const HEX_COLOUR_PATTERN = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i;
