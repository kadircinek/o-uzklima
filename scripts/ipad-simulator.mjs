#!/usr/bin/env node
// Mac'te Xcode'un iPad Pro simülatörünü açar ve LifeOS'u Safari'de yükler.
//
//   npm run ipad                         → http://localhost:3000, iPad Pro 13 inç
//   npm run ipad -- --11                 → iPad Pro 11 inç
//   npm run ipad -- https://lifeos.example.com
//
// Gerekenler: macOS ve Xcode (App Store). İlk açılışta Xcode → Settings →
// Components bölümünden bir iOS simülatörü indirilmiş olmalı.

import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

/** "com.apple.CoreSimulator.SimRuntime.iOS-18-2" → [18, 2] */
function surum(runtime) {
  const m = /iOS-(\d+)-(\d+)/.exec(runtime);
  return m ? [Number(m[1]), Number(m[2])] : [0, 0];
}

/**
 * `xcrun simctl list devices available -j` çıktısından iPad Pro seçer:
 * önce açık olanı, sonra en yeni iOS sürümündekini.
 * @param {{ devices: Record<string, { name: string; udid: string; state: string; isAvailable?: boolean }[]> }} liste
 * @param {"11" | "13"} model
 */
export function ipadSec(liste, model) {
  const desen = model === "11" ? /^iPad Pro.*\b11-inch/ : /^iPad Pro.*\b(13|12\.9)-inch/;
  const adaylar = Object.entries(liste.devices).flatMap(([runtime, cihazlar]) =>
    cihazlar
      .filter((c) => c.isAvailable !== false && desen.test(c.name))
      .map((c) => ({ ...c, surum: surum(runtime) })),
  );
  adaylar.sort(
    (a, b) =>
      Number(b.state === "Booted") - Number(a.state === "Booted") ||
      b.surum[0] - a.surum[0] ||
      b.surum[1] - a.surum[1] ||
      b.name.localeCompare(a.name),
  );
  return adaylar[0] ?? null;
}

/** Komut satırı: [adres] [--11|--13] */
export function argumanlariCoz(argv) {
  let adres = "http://localhost:3000";
  let model = "13";
  for (const a of argv) {
    if (/^https?:\/\//.test(a)) adres = a.replace(/\/+$/, "");
    else if (a === "--11" || a === "11") model = "11";
    else if (a === "--13" || a === "13") model = "13";
  }
  return { adres, model };
}

const xcrun = (...a) => execFileSync("xcrun", ["simctl", ...a], { encoding: "utf8" });

async function main() {
  const { adres, model } = argumanlariCoz(process.argv.slice(2));

  if (process.platform !== "darwin") {
    console.error("Xcode Simulator yalnızca macOS'ta çalışır.");
    console.error(`Bunun yerine tarayıcıda iPad Pro görünümünü açın: ${adres}/simulator`);
    process.exit(1);
  }
  try {
    execFileSync("xcrun", ["--find", "simctl"], { stdio: "ignore" });
  } catch {
    console.error("Xcode bulunamadı. App Store'dan Xcode'u kurup bir kez açın, sonra tekrar deneyin.");
    process.exit(1);
  }

  try {
    await fetch(adres, { redirect: "manual", signal: AbortSignal.timeout(5000) });
  } catch {
    console.warn(`Uyarı: ${adres} yanıt vermiyor. Önce uygulamayı başlatın (npm run demo ya da npm run dev).`);
  }

  const cihaz = ipadSec(JSON.parse(xcrun("list", "devices", "available", "-j")), model);
  if (!cihaz) {
    console.error(`iPad Pro ${model} inç simülatörü bulunamadı.`);
    console.error("Xcode → Settings → Components'tan iOS simülatörünü indirin ya da");
    console.error("Xcode → Window → Devices and Simulators → + ile bir iPad Pro ekleyin.");
    process.exit(1);
  }

  console.log(`${cihaz.name} (iOS ${cihaz.surum.join(".")}) açılıyor…`);
  execFileSync("open", ["-a", "Simulator", "--args", "-CurrentDeviceUDID", cihaz.udid]);
  xcrun("bootstatus", cihaz.udid, "-b");
  xcrun("openurl", cihaz.udid, adres);

  console.log(`Safari'de ${adres} açıldı.`);
  console.log("Uygulama gibi kullanmak için: Safari'de Paylaş → Ana Ekrana Ekle, sonra ana ekrandaki LifeOS simgesi.");
  console.log("Döndürmek için Simulator'da ⌘← / ⌘→.");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
