import type { Metadata } from "next";
import { IpadSimulator } from "@/components/ipad-simulator";
import { guvenliYol, modelCoz, yonCoz } from "@/lib/simulator";

export const metadata: Metadata = { title: "iPad Pro simülatörü" };

type Parametre = string | string[] | undefined;
const tek = (p: Parametre) => (Array.isArray(p) ? p[0] : p);

// Uygulamayı masaüstü tarayıcıda iPad Pro çerçevesi içinde gösterir.
// Sayfa veri içermez; çerçevedeki uygulama her zamanki gibi oturum ister.
export default async function SimulatorSayfasi({ searchParams }: { searchParams: Promise<Record<string, Parametre>> }) {
  const p = await searchParams;
  return <IpadSimulator yol={guvenliYol(tek(p.yol))} model={modelCoz(tek(p.model))} yon={yonCoz(tek(p.yon))} />;
}
