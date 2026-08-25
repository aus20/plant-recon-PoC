// Uygulamanın tanıma motoruna tek girişi.
// Ekranlar EachLabs'ı hiç görmüyor, sadece PlantResult ve IdentifyError biliyorlar.
// Anahtar şu an uygulama paketinde - bilinçli bir takas, README'de anlatılıyor.
import { identifyPlant } from "../../../shared/eachlabs.ts";
import { IdentifyError, type IdentifyResponse, type IdentifyStage } from "../../../shared/types.ts";
import { prepareImage } from "./image.ts";

const API_KEY = process.env.EXPO_PUBLIC_EACHLABS_API_KEY ?? "";

export type Photo = { uri: string; width: number; height: number };

export async function identify(
  photo: Photo,
  onStage: (stage: IdentifyStage) => void,
  signal?: AbortSignal,
): Promise<IdentifyResponse & { previewUri: string }> {
  if (!API_KEY) {
    throw new IdentifyError("auth", "No API key. Add EXPO_PUBLIC_EACHLABS_API_KEY to app/.env.");
  }

  const prepared = await prepareImage(photo.uri, photo.width, photo.height);
  const response = await identifyPlant(
    { body: prepared.body, contentType: prepared.contentType },
    { apiKey: API_KEY },
    { onStage, signal },
  );

  return { ...response, previewUri: prepared.uri };
}
