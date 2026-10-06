// Tarayıcı içi iPad Pro simülatörü için saf hesaplar: cihaz ölçüleri,
// yön, ekrana sığdırma ve çerçevede açılacak yolun doğrulanması.

export type IpadModeli = "11" | "13";
export type Yon = "dikey" | "yatay";

/** iPad Pro (M4) ekran ölçüleri, CSS pikseli (point) cinsinden, dikey yönde. */
export const IPAD_MODELLERI: Record<IpadModeli, { ad: string; en: number; boy: number }> = {
  "11": { ad: "iPad Pro 11 inç", en: 834, boy: 1210 },
  "13": { ad: "iPad Pro 13 inç", en: 1032, boy: 1376 },
};

/** Ana ekrana eklenmiş uygulamada üstte durum çubuğu, altta ana ekran çizgisi payı. */
export const DURUM_CUBUGU = 24;
export const ALT_PAY = 20;
/** Cihazın ekran çevresindeki çerçeve kalınlığı. */
export const CERCEVE = 18;

export function ekranBoyutu(model: IpadModeli, yon: Yon): { en: number; boy: number } {
  const { en, boy } = IPAD_MODELLERI[model];
  return yon === "dikey" ? { en, boy } : { en: boy, boy: en };
}

/** Uygulamanın gördüğü pencere: ekrandan durum çubuğu ve alt pay düşülür. */
export function uygulamaPenceresi(model: IpadModeli, yon: Yon): { en: number; boy: number } {
  const e = ekranBoyutu(model, yon);
  return { en: e.en, boy: e.boy - DURUM_CUBUGU - ALT_PAY };
}

/** Çerçeveli cihazı verilen alana sığdıran ölçek (en fazla 1, en az 0.2). */
export function sigdirmaOlcegi(model: IpadModeli, yon: Yon, alan: { en: number; boy: number }): number {
  const e = ekranBoyutu(model, yon);
  const olcek = Math.min(alan.en / (e.en + 2 * CERCEVE), alan.boy / (e.boy + 2 * CERCEVE), 1);
  return Math.max(0.2, Math.floor(olcek * 100) / 100);
}

/** Çerçevede açılacak yol: yalnızca uygulama içi, simülatörün kendisi hariç. */
export function guvenliYol(yol: string | null | undefined): string {
  if (!yol || !yol.startsWith("/") || yol.startsWith("//") || yol.includes("\\")) return "/";
  if (/^\/simulator(\/|\?|#|$)/.test(yol)) return "/";
  return yol;
}

export function modelCoz(deger: string | null | undefined): IpadModeli {
  return deger === "11" ? "11" : "13";
}

export function yonCoz(deger: string | null | undefined): Yon {
  return deger === "dikey" ? "dikey" : "yatay";
}
