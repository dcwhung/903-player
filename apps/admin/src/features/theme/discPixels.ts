/*
 * 碟面圖 → 64×64 RGBA 像素（browser canvas 縮細，抽色用）。圖由同 origin 嘅 /catalog/v1/img 出，canvas 唔會被污染
 */
const SAMPLE_PX = 64;

export const readDiscPixels = async (url: string): Promise<Uint8ClampedArray> => {
    const image = new Image();
    image.src = url;
    await image.decode();
    const canvas = Object.assign(document.createElement('canvas'), {
        width: SAMPLE_PX,
        height: SAMPLE_PX,
    });
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('canvas 2d unavailable');
    context.drawImage(image, 0, 0, SAMPLE_PX, SAMPLE_PX);
    return context.getImageData(0, 0, SAMPLE_PX, SAMPLE_PX).data;
};
