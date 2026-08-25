// EachLabs istemcisi.
// Bilerek sadece fetch kullandım, Node'a özel hiçbir şey yok - aynı dosya hem doğrulama
// scriptinde hem uygulamada çalışsın diye. Anahtarı ileride sunucuya taşımak gerekirse
// bu dosya olduğu gibi oraya da taşınabilir.
// Akış: presign -> S3'e PUT -> prediction -> poll. API sadece async, sync uç yok.

import {
  IdentifyError,
  type IdentifyErrorCode,
  type IdentifyResponse,
  type IdentifyStage,
  type PlantResult,
} from "./types.ts";

const BASE_URL = "https://api.eachlabs.ai/v1";
const MODEL = "gemini-2-5-flash";
const MODEL_VERSION = "0.0.1";

/** Tek istek için süre sınırı. Mobil veride S3 yavaş olabiliyor, bol tuttum. */
const REQUEST_TIMEOUT_MS = 30_000;
/** Poll aşamasının toplam sınırı. Ölçtüğümde ~6 sn sürüyordu. */
const POLL_TIMEOUT_MS = 60_000;
const POLL_FIRST_DELAY_MS = 1_500;
const POLL_INTERVAL_MS = 700;

export type EachLabsConfig = {
  apiKey: string;
  /** 0 = düşünmeyi kapat. Ölçtüm: 3 kat hızlı, cins aynı. -1 modele bırakır. */
  thinkingBudget?: number;
};

export type ImageInput = {
  /** Ham byte. RN'de Blob, Node'da Uint8Array. */
  body: Uint8Array | ArrayBuffer | Blob;
  contentType: string;
};

export type IdentifyOptions = {
  signal?: AbortSignal;
  onStage?: (stage: IdentifyStage) => void;
  /** Sadece doğrulama scripti için. Uygulama kullanmıyor. */
  onDebug?: (label: string, payload: unknown) => void;
};

/* --- prompt --- */

const SYSTEM_INSTRUCTION = `You are a botanist identifying a plant from a single photograph.

Rules:
- If the photo does not contain a plant, set is_plant to false, confidence to 0, and leave
  every text field as an empty string. Do not invent a plant.
- confidence is your calibrated probability that scientific_name is correct, from 0 to 1.
  Be honest: a blurry leaf with no flowers rarely deserves more than 0.6.
- alternatives holds up to three other species you seriously considered, most likely first,
  never repeating the primary identification. Return an empty array if you are certain.
- toxicity is the field people act on, so grade it precisely:
    severity "none"    - no known toxicity; say so explicitly in details.
    severity "mild"    - may cause temporary stomach upset if a quantity is eaten.
                         Most plants belong here rather than in "serious".
    severity "serious" - can cause real harm: organ damage, severe reaction, death.
  Set toxic_to_pets and toxic_to_humans to false when severity is "none". Do not inflate
  a mild irritant into a serious hazard, and do not soften a genuinely dangerous plant.
- Write for a curious non-expert. No markdown, no bullet points, no lists.

Length limits. These are read on a phone, so brevity is part of being correct:
- care.light.value, care.water.value, care.soil.value: a label of at most FOUR words.
  Write "Bright indirect light", "Keep evenly moist", "Rich and free-draining".
  Never write a sentence here.
- care.light.detail, care.water.detail, care.soil.detail: ONE sentence, at most 20 words,
  specific to this species rather than generic houseplant advice.
- care.summary: ONE sentence, at most 20 words.
- description: at most TWO sentences.
- toxicity.details: at most TWO sentences.`;

const USER_PROMPT = "Identify the plant in this photograph.";

/** Kısa etiket + tek cümle. Işık, su ve toprak için aynı yapı. */
const CARE_FACT = {
  type: "object",
  properties: { value: { type: "string" }, detail: { type: "string" } },
  required: ["value", "detail"],
} as const;

// Gemini'nin cevap şeması. Bu modeli seçmemin sebebi bu: çıktı garantili bu şekle
// uyuyor, metnin içinden JSON ayıklamak zorunda kalmıyorum.
const PLANT_SCHEMA = {
  type: "object",
  properties: {
    is_plant: { type: "boolean" },
    confidence: { type: "number" },
    common_name: { type: "string" },
    scientific_name: { type: "string" },
    family: { type: "string" },
    description: { type: "string" },
    care: {
      type: "object",
      properties: {
        light: CARE_FACT,
        water: CARE_FACT,
        soil: CARE_FACT,
        difficulty: { type: "string", enum: ["easy", "moderate", "hard"] },
        summary: { type: "string" },
      },
      required: ["light", "water", "soil", "difficulty", "summary"],
    },
    toxicity: {
      type: "object",
      properties: {
        toxic_to_pets: { type: "boolean" },
        toxic_to_humans: { type: "boolean" },
        severity: { type: "string", enum: ["none", "mild", "serious"] },
        details: { type: "string" },
      },
      required: ["toxic_to_pets", "toxic_to_humans", "severity", "details"],
    },
    alternatives: {
      type: "array",
      items: {
        type: "object",
        properties: {
          common_name: { type: "string" },
          scientific_name: { type: "string" },
          confidence: { type: "number" },
        },
        required: ["common_name", "scientific_name", "confidence"],
      },
    },
  },
  required: [
    "is_plant",
    "confidence",
    "common_name",
    "scientific_name",
    "family",
    "description",
    "care",
    "toxicity",
    "alternatives",
  ],
} as const;

/* --- http --- */

// Zaman aşımlı fetch. AbortSignal.timeout kullanmadım, RN'in eski fetch'inde yok.
async function httpFetch(url: string, init: RequestInit, signal?: AbortSignal): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const onOuterAbort = () => controller.abort();
  signal?.addEventListener("abort", onOuterAbort);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (cause) {
    if (signal?.aborted) throw new IdentifyError("network", "Cancelled.");
    throw new IdentifyError("network", "Could not reach the network.");
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onOuterAbort);
  }
}

/** HTTP kodunu ekranın tanıdığı hata koduna çeviriyor. */
function codeForStatus(status: number, fallback: IdentifyErrorCode): IdentifyErrorCode {
  if (status === 401 || status === 403) return "auth";
  if (status === 429) return "rate_limit";
  if (status >= 500) return "server";
  return fallback;
}

async function readError(res: Response): Promise<string> {
  try {
    const text = await res.text();
    try {
      const parsed = JSON.parse(text) as { error?: string; message?: string };
      return parsed.error ?? parsed.message ?? text.slice(0, 200);
    } catch {
      return text.slice(0, 200);
    }
  } catch {
    return `HTTP ${res.status}`;
  }
}

/* --- adımlar --- */

type PresignResponse = {
  id: string;
  presigned_url: string;
  public_url: string;
  expires_at: string;
  required_headers: Record<string, string>;
};

/** Tek zorunlu alan content_type, gerisi cevapta geliyor. */
async function presign(contentType: string, cfg: EachLabsConfig, opts: IdentifyOptions) {
  const res = await httpFetch(
    `${BASE_URL}/upload/presign`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-Key": cfg.apiKey },
      body: JSON.stringify({ content_type: contentType }),
    },
    opts.signal,
  );

  if (!res.ok) {
    throw new IdentifyError(codeForStatus(res.status, "upload_failed"), await readError(res));
  }

  const json = (await res.json()) as PresignResponse;
  opts.onDebug?.("presign", json);
  return json;
}

// S3'e yükleme.
// TUZAK: required_headers'ı olduğu gibi geri göndermek şart. İmza
// x-amz-meta-file-id'yi kapsıyor; göndermezsen 403 SignatureDoesNotMatch alıyorsun,
// yükleme hatası gibi duruyor ama imza hatası.
// URL gerçekte 900 sn yaşıyor.
async function uploadBytes(target: PresignResponse, image: ImageInput, opts: IdentifyOptions) {
  const res = await httpFetch(
    target.presigned_url,
    { method: "PUT", headers: target.required_headers, body: image.body as BodyInit },
    opts.signal,
  );

  if (!res.ok) {
    throw new IdentifyError("upload_failed", `Storage rejected the photo (HTTP ${res.status}).`);
  }
  opts.onDebug?.("upload", { status: res.status, public_url: target.public_url });
}

async function createPrediction(imageUrl: string, cfg: EachLabsConfig, opts: IdentifyOptions): Promise<string> {
  const res = await httpFetch(
    `${BASE_URL}/prediction`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-Key": cfg.apiKey },
      body: JSON.stringify({
        model: MODEL,
        version: MODEL_VERSION,
        input: {
          prompt: USER_PROMPT,
          system_instruction: SYSTEM_INSTRUCTION,
          media_urls: [imageUrl],
          response_mime_type: "application/json",
          response_schema: PLANT_SCHEMA,
          temperature: 0.2,
          thinking_budget: cfg.thinkingBudget ?? 0,
        },
      }),
    },
    opts.signal,
  );

  if (!res.ok) {
    throw new IdentifyError(codeForStatus(res.status, "prediction_failed"), await readError(res));
  }

  const json = (await res.json()) as Record<string, unknown>;
  opts.onDebug?.("create", json);

  // Doküman predictionID diyor, SDK örneği .id okuyor. İkisini de kabul ediyorum.
  const id = (json.predictionID ?? json.prediction_id ?? json.id) as string | undefined;
  if (!id) throw new IdentifyError("server", "Prediction id missing from response.");
  return id;
}

type PredictionStatus = {
  status: string;
  output?: unknown;
  error?: string;
  metrics?: { predict_time?: number; cost?: number };
};

const DONE = new Set(["success", "succeeded", "completed"]);
const FAILED = new Set(["error", "failed", "cancelled", "canceled"]);

async function pollPrediction(id: string, cfg: EachLabsConfig, opts: IdentifyOptions): Promise<PredictionStatus> {
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  let delay = POLL_FIRST_DELAY_MS;

  while (Date.now() < deadline) {
    await sleep(delay, opts.signal);
    delay = POLL_INTERVAL_MS;

    const res = await httpFetch(
      `${BASE_URL}/prediction/${id}`,
      { headers: { "X-API-Key": cfg.apiKey } },
      opts.signal,
    );

    if (!res.ok) {
      throw new IdentifyError(codeForStatus(res.status, "prediction_failed"), await readError(res));
    }

    const json = (await res.json()) as PredictionStatus;
    opts.onDebug?.("poll", json);

    if (DONE.has(json.status)) return json;
    if (FAILED.has(json.status)) {
      throw new IdentifyError("prediction_failed", json.error || `Prediction ${json.status}.`);
    }
  }

  throw new IdentifyError("timeout", "The model took too long to answer.");
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new IdentifyError("network", "Cancelled."));
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(new IdentifyError("network", "Cancelled."));
    }, { once: true });
  });
}

/* --- parse --- */

const EMPTY_FACT = { value: "", detail: "" };

export type ParsedOutput = { result: PlantResult; neededRepair: boolean };

// Test edebilmek için dışa açtım. Bozuk cevap burada tipli hataya dönüşüyor.
// Bayrağı sonuçla beraber döndürüyorum - modül değişkeni olsaydı eş zamanlı
// iki istek birbirinin sonucunu ezerdi.
export function parseResult(output: unknown): ParsedOutput {
  const raw = typeof output === "string" ? output : JSON.stringify(output);

  let parsed: unknown;
  let neededRepair = false;
  try {
    parsed = JSON.parse(raw);
  } catch {
    const stripped = raw.replace(/^\s*```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "");
    try {
      parsed = JSON.parse(stripped);
      neededRepair = true;
    } catch {
      throw new IdentifyError("bad_output", "The model did not return usable JSON.");
    }
  }

  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      throw new IdentifyError("bad_output", "The model returned a string, not an object.");
    }
  }

  const r = parsed as Partial<PlantResult>;
  if (typeof r?.is_plant !== "boolean" || typeof r?.confidence !== "number") {
    throw new IdentifyError("bad_output", "The model's answer was missing required fields.");
  }

  return {
    result: {
      is_plant: r.is_plant,
      confidence: r.confidence,
      common_name: r.common_name ?? "",
      scientific_name: r.scientific_name ?? "",
      family: r.family ?? "",
      description: r.description ?? "",
      care: r.care ?? {
        light: EMPTY_FACT,
        water: EMPTY_FACT,
        soil: EMPTY_FACT,
        difficulty: "moderate",
        summary: "",
      },
      toxicity: r.toxicity ?? {
        toxic_to_pets: false,
        toxic_to_humans: false,
        severity: "none",
        details: "",
      },
      alternatives: Array.isArray(r.alternatives) ? r.alternatives : [],
    },
    neededRepair,
  };
}

/* --- giriş --- */

export async function identifyPlant(
  image: ImageInput,
  cfg: EachLabsConfig,
  opts: IdentifyOptions = {},
): Promise<IdentifyResponse> {
  const startedAt = Date.now();

  opts.onStage?.("uploading");
  const target = await presign(image.contentType, cfg, opts);
  await uploadBytes(target, image, opts);

  opts.onStage?.("analyzing");
  const id = await createPrediction(target.public_url, cfg, opts);
  const prediction = await pollPrediction(id, cfg, opts);

  const parsed = parseResult(prediction.output);

  return {
    result: parsed.result,
    metrics: {
      predictTime: prediction.metrics?.predict_time ?? 0,
      cost: prediction.metrics?.cost ?? 0,
      totalMs: Date.now() - startedAt,
      outputRepaired: parsed.neededRepair,
    },
  };
}
