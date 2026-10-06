"use client";

import { useActionState } from "react";
import { sifreDegistir } from "@/app/actions/oturum";
import { Buton, Etiket, Girdi, Hata, Kart } from "./ui";

export function SifreFormu() {
  const [durum, eylem, bekliyor] = useActionState(sifreDegistir, { hata: null });
  return (
    <Kart className="p-5">
      <form action={eylem} className="space-y-4">
        <Etiket ad="Yeni şifre (en az 8 karakter)">
          <Girdi name="sifre" type="password" autoComplete="new-password" minLength={8} required autoFocus />
        </Etiket>
        <Etiket ad="Yeni şifre (tekrar)">
          <Girdi name="tekrar" type="password" autoComplete="new-password" minLength={8} required />
        </Etiket>
        <Hata>{durum.hata}</Hata>
        <Buton type="submit" tur="birincil" className="w-full" disabled={bekliyor}>
          {bekliyor ? "Kaydediliyor…" : "Şifreyi kaydet"}
        </Buton>
      </form>
    </Kart>
  );
}
