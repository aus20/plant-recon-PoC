// Uygulamanın ve doğrulama scriptinin paylaştığı sözleşme. Tek yerde dursun.

/** Bakımı ne kadar zor */
export type CareDifficulty = "easy" | "moderate" | "hard";

// Kısa etiket + tek cümle açıklama. value cümle değil, "Bright indirect light" gibi.
export type CareFact = {
  value: string;
  detail: string;
};

export type PlantCare = {
  light: CareFact;
  water: CareFact;
  soil: CareFact;
  difficulty: CareDifficulty;
  /** Tek cümle, hemen uygulanabilir olsun */
  summary: string;
};

// Boolean yetmedi: "kediyi zehirler" ile "midesi bulanır" aynı kutuya giriyordu,
// model de prompt'a göre taraf değiştiriyordu. O yüzden ölçek koydum.
export type ToxicitySeverity = "none" | "mild" | "serious";

export type PlantToxicity = {
  toxic_to_pets: boolean;
  toxic_to_humans: boolean;
  severity: ToxicitySeverity;
  /** Hangi kısmı, hangi hayvan, ne olur. Bilinmiyorsa boş. */
  details: string;
};

/** Modelin aklına gelen diğer ihtimaller. Emin değilsek bunları gösteriyoruz. */
export type PlantAlternative = {
  common_name: string;
  scientific_name: string;
  confidence: number;
};

export type PlantResult = {
  /** Sandalye, el, bulanık duvar için false. Ekran önce buna bakıyor. */
  is_plant: boolean;
  /** 0-1 arası. LOW_CONFIDENCE altındaysa kesin konuşmuyoruz. */
  confidence: number;
  common_name: string;
  scientific_name: string;
  family: string;
  description: string;
  care: PlantCare;
  toxicity: PlantToxicity;
  alternatives: PlantAlternative[];
};

/** Bunun altında cevap tahmin sayılır, alternatifleri gösteriyoruz. */
export const LOW_CONFIDENCE = 0.6;

/** PlantResult'un şu anki hali. Her geçmiş kaydına yazılıyor. */
export const RESULT_SCHEMA_VERSION = 2;

/** Ne kadar bekledik, ne kadar ödedik. README'deki ölçümler buradan. */
export type IdentifyMetrics = {
  /** EachLabs'in verdiği model süresi, saniye */
  predictTime: number;
  /** Bu tek tanımanın maliyeti, dolar */
  cost: number;
  /** Baştan sona geçen süre, ms. Yükleme dahil. */
  totalMs: number;
  /** Model JSON'u markdown bloğuna sardıysa true. Normalde hep false olmalı. */
  outputRepaired: boolean;
};

export type IdentifyResponse = {
  result: PlantResult;
  metrics: IdentifyMetrics;
};

// Ekranda ayrı ayrı gösterdiğim hatalar. Beklenmedik her şey "server" oluyor,
// kullanıcıya ham hata mesajı gitmesin.
export type IdentifyErrorCode =
  | "network"
  | "auth"
  | "rate_limit"
  | "upload_failed"
  | "prediction_failed"
  | "timeout"
  | "bad_output"
  | "server";

export class IdentifyError extends Error {
  readonly code: IdentifyErrorCode;

  constructor(code: IdentifyErrorCode, message: string) {
    super(message);
    this.name = "IdentifyError";
    this.code = code;
  }
}

/** Yükleme ekranı için. 6 saniye sürüyor, o yüzden adımlar gerçek. */
export type IdentifyStage = "uploading" | "analyzing";

/** Cihazda tutulan tek bir tanıma kaydı. */
export type HistoryEntry = {
  id: string;
  /** PlantResult değişince artırıyorum, eskiler okunurken eleniyor. */
  schema: number;
  /** Epoch, ms */
  savedAt: number;
  /** Kalıcı dizine kopyalanan foto. Önbellekte bıraksam iOS silebilir. */
  imageUri: string;
  response: IdentifyResponse;
};

// Ekran durumları. Varsayılan home; kamera gidilen bir yer, açılışta dayatılan değil.
export type UiState =
  | { kind: "home" }
  | { kind: "capture" }
  | { kind: "loading"; stage: IdentifyStage; imageUri: string }
  | { kind: "success"; response: IdentifyResponse; imageUri: string }
  | { kind: "error"; code: IdentifyErrorCode };
