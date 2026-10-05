"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { GorevTuru } from "@/lib/domain";
import type { GorevListeSatiri } from "@/lib/server/queries";
import { GorevDuzenle } from "./gorev";
import { IkonArti } from "./icons";
import { Buton } from "./ui";

export function YeniGorevDugmesi({
  tur,
  companyId,
  saatDilimi,
}: {
  tur?: GorevTuru;
  companyId?: string;
  saatDilimi: string;
}) {
  const [acik, setAcik] = useState(false);
  return (
    <>
      <Buton kucuk onClick={() => setAcik(true)}>
        <IkonArti className="size-4" /> Görev
      </Buton>
      <GorevDuzenle
        acik={acik}
        kapat={() => setAcik(false)}
        gorev={null}
        varsayilan={{ tur, company_id: companyId }}
        saatDilimi={saatDilimi}
      />
    </>
  );
}

/** Bildirimden "Aç" ile gelindiğinde (?gorev=…) görevi düzenleme penceresinde açar. */
export function GorevAc({ gorev, saatDilimi }: { gorev: GorevListeSatiri; saatDilimi: string }) {
  const [acik, setAcik] = useState(true);
  const router = useRouter();
  return (
    <GorevDuzenle
      acik={acik}
      gorev={gorev}
      saatDilimi={saatDilimi}
      kapat={() => {
        setAcik(false);
        const url = new URL(window.location.href);
        url.searchParams.delete("gorev");
        router.replace(url.pathname + url.search);
      }}
    />
  );
}
