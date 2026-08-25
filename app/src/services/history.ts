// Cihazdaki tanıma geçmişi.
// Fotoğrafları önbellekten kalıcı dizine kopyalıyorum; iOS önbelleği silebiliyor ve
// geçmiş kırık küçük resimlerle dolu kalırdı.
// Veritabanı yok, hesap yok - bu boyuttaki bir liste için fotoğrafların yanındaki
// tek bir JSON dosyası yetiyor.
import { Directory, File, Paths } from "expo-file-system";
import { RESULT_SCHEMA_VERSION, type HistoryEntry, type IdentifyResponse } from "../../../shared/types.ts";

const FOLDER = "history";
const INDEX = "index.json";
/** Eskiler listeden düşüyor. Kimse otuzuncu kaydın altına inmiyor. */
const MAX_ENTRIES = 30;

function folder(): Directory {
  const dir = new Directory(Paths.document, FOLDER);
  if (!dir.exists) dir.create({ intermediates: true });
  return dir;
}

function indexFile(): File {
  return new File(folder(), INDEX);
}

export function listHistory(): HistoryEntry[] {
  try {
    const file = indexFile();
    if (!file.exists) return [];
    const parsed = JSON.parse(file.textSync()) as HistoryEntry[];
    if (!Array.isArray(parsed)) return [];
    // Eski PlantResult'la yazılmış kayıtlar boş alanlarla görünürdü, o yüzden eliyorum.
    return parsed.filter((entry) => entry?.schema === RESULT_SCHEMA_VERSION);
  } catch {
    // Bozuk index uygulamayı kilitlemesin; boş geçmiş geri alınabilir bir durum.
    return [];
  }
}

function writeIndex(entries: HistoryEntry[]) {
  const file = indexFile();
  if (!file.exists) file.create();
  file.write(JSON.stringify(entries));
}

export function addToHistory(response: IdentifyResponse, sourceUri: string): HistoryEntry[] {
  const entries = listHistory();

  const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  let imageUri = sourceUri;
  try {
    const destination = new File(folder(), `${id}.jpg`);
    new File(sourceUri).copy(destination);
    imageUri = destination.uri;
  } catch {
    // Kaydı tamamen kaybetmektense önbellek yolunu tutuyorum, küçük resim solabilir.
  }

  const entry: HistoryEntry = { id, schema: RESULT_SCHEMA_VERSION, savedAt: Date.now(), imageUri, response };
  const next = [entry, ...entries].slice(0, MAX_ENTRIES);

  // Listeden yeni düşen kayıtların fotoğraflarını siliyorum.
  for (const dropped of entries.slice(MAX_ENTRIES - 1)) {
    try {
      const file = new File(dropped.imageUri);
      if (file.exists) file.delete();
    } catch {}
  }

  writeIndex(next);
  return next;
}

export function clearHistory(): HistoryEntry[] {
  try {
    const dir = folder();
    if (dir.exists) dir.delete();
  } catch {}
  return [];
}
