/** Galeri açma. Hem ana sayfa hem kamera ekranı kullanıyor. */
import * as ImagePicker from "expo-image-picker";
import type { Photo } from "./identify.ts";

export async function pickFromLibrary(): Promise<Photo | null> {
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 1 });
  const asset = result.assets?.[0];
  if (result.canceled || !asset) return null;
  return { uri: asset.uri, width: asset.width, height: asset.height };
}
