// Fotoğrafı telefondan çıkmadan önce küçültüyorum.
// Ham 12MP dosya birkaç MB; mobil veride 6 saniyelik akışı 20 saniye yapar,
// üstelik model fazladan pikselden bir şey kazanmıyor.
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";

const MAX_EDGE = 1024;
const JPEG_QUALITY = 0.85;

export type PreparedImage = {
  /** Küçültülmüş kopyanın yolu, ekranda bunu gösteriyoruz. */
  uri: string;
  body: Blob;
  contentType: string;
};

export async function prepareImage(uri: string, width: number, height: number): Promise<PreparedImage> {
  const longestEdge = Math.max(width, height);

  let sourceUri = uri;
  if (longestEdge > MAX_EDGE) {
    const context = ImageManipulator.manipulate(uri);
    // resize() tek ölçü verilince oranı koruyor, o yüzden hangi kenar uzunsa onu veriyorum.
    context.resize(width >= height ? { width: MAX_EDGE } : { height: MAX_EDGE });
    const rendered = await context.renderAsync();
    const saved = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: JPEG_QUALITY });
    sourceUri = saved.uri;
  }

  // RN'in fetch'i file:// okuyabiliyor; yerel dosyadan byte almanın en kısa yolu bu.
  const response = await fetch(sourceUri);
  const body = await response.blob();

  return { uri: sourceUri, body, contentType: "image/jpeg" };
}
