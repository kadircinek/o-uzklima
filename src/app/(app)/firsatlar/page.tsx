import Link from "next/link";
import { FirsatDugmesi, FirsatPanosu } from "@/components/firsat";
import { Bos, SayfaBasligi } from "@/components/ui";
import { ACIK_ASAMALAR } from "@/lib/domain";
import { ayarlariGetir, bugun } from "@/lib/server/ops";
import { firsatlar } from "@/lib/server/queries";
import { requireUser } from "@/lib/supabase/server";

export const metadata = { title: "Fırsatlar" };

export default async function FirsatlarSayfasi({ searchParams }: { searchParams: Promise<{ kapali?: string }> }) {
  const { kapali } = await searchParams;
  const { supabase, userId } = await requireUser();
  const ayarlar = await ayarlariGetir(supabase, userId);
  const liste = await firsatlar(supabase);
  const acikSayisi = liste.filter((f) => ACIK_ASAMALAR.includes(f.asama)).length;
  const kapalilariGoster = kapali === "1";

  return (
    <>
      <SayfaBasligi
        baslik="Fırsatlar"
        alt={`${acikSayisi} açık fırsat · aşama değişince takip görevi otomatik açılır`}
        aksiyon={<FirsatDugmesi />}
      />
      <div className="mb-3 flex justify-end">
        <Link href={kapalilariGoster ? "/firsatlar" : "/firsatlar?kapali=1"} className="text-sm text-muted hover:text-ink">
          {kapalilariGoster ? "Kaybedilenleri gizle" : "Kaybedilenleri göster"}
        </Link>
      </div>
      {liste.length === 0 ? (
        <Bos>Henüz fırsat yok. Bir teklif ya da numune girdiğinde gelen kutusundan da oluşturabilirsin.</Bos>
      ) : (
        <FirsatPanosu firsatlar={liste} bugun={bugun(ayarlar)} ayarlar={ayarlar} kapalilariGoster={kapalilariGoster} />
      )}
    </>
  );
}
