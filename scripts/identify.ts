// Faz 1 doğrulaması: bütün akışı Node'dan canlı API'ye karşı çalıştırıyor.
// Telefon ve Expo hiç devrede değil.
//
//   node --env-file=.env scripts/identify.ts <foto> [--raw] [--think]
//
// --raw    her API cevabını bas
// --think  Gemini'nin düşünmesini aç (varsayılan kapalı)

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { extname, basename } from "node:path";
import { identifyPlant } from "../shared/eachlabs.ts";
import { IdentifyError, LOW_CONFIDENCE } from "../shared/types.ts";

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".heic": "image/heic",
};

function bar(label: string) {
  console.log(`\n\x1b[1m${label}\x1b[0m`);
}

async function main() {
  const args = process.argv.slice(2);
  const raw = args.includes("--raw");
  const think = args.includes("--think");
  // --dump <klasör> API cevaplarını diske yazıyor. Test fixture'ları böylece
  // gerçek API'den geliyor, elle uydurulmuş veriden değil.
  const dumpDir = args.includes("--dump") ? args[args.indexOf("--dump") + 1] : undefined;
  const path = args.find((a) => !a.startsWith("--"));

  if (!path) {
    console.error("usage: node --env-file=.env scripts/identify.ts <image> [--raw] [--think]");
    process.exit(2);
  }

  const apiKey = process.env.EACHLABS_API_KEY;
  if (!apiKey) {
    console.error("EACHLABS_API_KEY is not set. Did you pass --env-file=.env ?");
    process.exit(2);
  }

  const contentType = MIME[extname(path).toLowerCase()];
  if (!contentType) {
    console.error(`Unsupported file type: ${extname(path)}`);
    process.exit(2);
  }

  const bytes = await readFile(path);
  console.log(`file      ${basename(path)}  ${(bytes.byteLength / 1024).toFixed(0)} KB  ${contentType}`);
  console.log(`thinking  ${think ? "enabled (-1)" : "disabled (0)"}`);

  try {
    const { result, metrics } = await identifyPlant(
      { body: bytes, contentType },
      { apiKey, thinkingBudget: think ? -1 : 0 },
      {
        onStage: (stage) => console.log(`stage     ${stage}`),
        onDebug: async (label, payload) => {
          if (raw) console.log(`  [${label}]`, JSON.stringify(payload).slice(0, 700));
          if (dumpDir) {
            await mkdir(dumpDir, { recursive: true });
            await writeFile(`${dumpDir}/${label}.json`, JSON.stringify(payload, null, 2));
          }
        },
      },
    );

    if (!result.is_plant) {
      bar("NOT A PLANT");
      console.log("The model reports there is no plant in this photo.");
    } else {
      bar(`${result.common_name}  (${result.scientific_name})`);
      console.log(`family      ${result.family}`);
      console.log(`confidence  ${(result.confidence * 100).toFixed(0)}%${result.confidence < LOW_CONFIDENCE ? "   <- low, UI must hedge" : ""}`);
      console.log(`about       ${result.description}`);

      bar("CARE");
      console.log(`light       ${result.care.light.value}  -- ${result.care.light.detail}`);
      console.log(`water       ${result.care.water.value}  -- ${result.care.water.detail}`);
      console.log(`soil        ${result.care.soil.value}  -- ${result.care.soil.detail}`);
      console.log(`difficulty  ${result.care.difficulty}`);
      console.log(`summary     ${result.care.summary}`);

      bar("TOXICITY");
      console.log(`severity    ${result.toxicity.severity}`);
      console.log(`pets        ${result.toxicity.toxic_to_pets ? "affected" : "safe"}`);
      console.log(`humans      ${result.toxicity.toxic_to_humans ? "affected" : "safe"}`);
      console.log(`details     ${result.toxicity.details}`);

      if (result.alternatives.length) {
        bar("ALTERNATIVES");
        for (const alt of result.alternatives) {
          console.log(`  ${(alt.confidence * 100).toFixed(0).padStart(3)}%  ${alt.common_name} (${alt.scientific_name})`);
        }
      }
    }

    bar("MEASURED");
    console.log(`predict_time  ${metrics.predictTime.toFixed(2)} s   (model only)`);
    console.log(`total         ${(metrics.totalMs / 1000).toFixed(2)} s   (upload + predict + poll)`);
    console.log(`cost          $${metrics.cost.toFixed(6)}   -> ${Math.floor(1 / (metrics.cost || 1))} identifications per $1`);
    console.log(`json repair   ${metrics.outputRepaired ? "NEEDED - structured output claim is wrong" : "not needed"}`);
  } catch (err) {
    if (err instanceof IdentifyError) {
      console.error(`\nFAILED [${err.code}] ${err.message}`);
      process.exit(1);
    }
    throw err;
  }
}

main();
