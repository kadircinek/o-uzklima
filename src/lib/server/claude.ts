import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { weekday, type DateStr } from "../dates";
import { AyristirmaSemasi, ayristirmayiDuzelt, type Ayristirma } from "../parse/schema";
import { firmaDizini, kullaniciMesaji, TALIMATLAR, type DizinFirmasi } from "../parse/prompt";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-5-5";

let istemci: Anthropic | null = null;
function claude(): Anthropic {
  // Hızlı giriş etkileşimli olduğu için kısa zaman aşımı ve tek yeniden deneme.
  istemci ??= new Anthropic({ timeout: 30_000, maxRetries: 1 });
  return istemci;
}

export function claudeYapilandirildiMi(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}

export class AyristirmaHatasi extends Error {}

export async function ayristir(
  metin: string,
  secenekler: { bugun: DateStr; firmalar: DizinFirmasi[]; toplanti: boolean },
): Promise<Ayristirma> {
  let yanit;
  try {
    yanit = await claude().beta.messages.parse({
      model: MODEL,
      max_tokens: 8000,
      // Ayrıştırma basit bir çıkarım işi: düşük efor gecikmeyi kısaltır.
      output_config: { effort: "low", format: betaZodOutputFormat(AyristirmaSemasi) },
      // Güvenlik sınıflandırıcısı reddederse istek sunucu tarafında önerilen
      // yedek modelde yeniden çalıştırılır.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: [
        { type: "text", text: TALIMATLAR },
        { type: "text", text: firmaDizini(secenekler.firmalar), cache_control: { type: "ephemeral" } },
      ],
      messages: [
        {
          role: "user",
          content: kullaniciMesaji(metin, secenekler.bugun, weekday(secenekler.bugun), secenekler.toplanti),
        },
      ],
    });
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) throw new AyristirmaHatasi("Claude API anahtarı geçersiz.");
    if (e instanceof Anthropic.RateLimitError) throw new AyristirmaHatasi("Claude API sınırına ulaşıldı, biraz sonra deneyin.");
    if (e instanceof Anthropic.APIConnectionTimeoutError) throw new AyristirmaHatasi("Claude API zaman aşımına uğradı.");
    if (e instanceof Anthropic.APIError) throw new AyristirmaHatasi(`Claude API hatası (${e.status ?? "bağlantı"}).`);
    throw e;
  }

  if (yanit.stop_reason === "refusal") throw new AyristirmaHatasi("Claude bu girdiyi işlemeyi reddetti.");
  if (yanit.stop_reason === "max_tokens") throw new AyristirmaHatasi("Claude yanıtı yarıda kesildi.");
  if (!yanit.parsed_output) throw new AyristirmaHatasi("Claude yanıtı okunamadı.");
  return ayristirmayiDuzelt(yanit.parsed_output, metin);
}
