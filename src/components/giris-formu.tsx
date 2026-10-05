"use client";

import { useActionState } from "react";
import { girisYap } from "@/app/actions/oturum";
import { Buton, Etiket, Girdi, Hata, Kart } from "./ui";

export function GirisFormu({ sonra }: { sonra: string }) {
  const [durum, eylem, bekliyor] = useActionState(girisYap, { hata: null });
  return (
    <Kart className="p-5">
      <form action={eylem} className="space-y-4">
        <input type="hidden" name="sonra" value={sonra} />
        <Etiket ad="E-posta">
          <Girdi name="eposta" type="email" autoComplete="email" defaultValue={durum.eposta} required autoFocus={!durum.eposta} />
        </Etiket>
        <Etiket ad="Şifre">
          <Girdi name="sifre" type="password" autoComplete="current-password" required autoFocus={Boolean(durum.eposta)} />
        </Etiket>
        <Hata>{durum.hata}</Hata>
        <Buton type="submit" tur="birincil" className="w-full" disabled={bekliyor}>
          {bekliyor ? "Giriş yapılıyor…" : "Giriş yap"}
        </Buton>
      </form>
    </Kart>
  );
}
