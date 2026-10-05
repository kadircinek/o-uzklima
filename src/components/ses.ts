"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

// Sesli not: tarayıcının konuşma tanıma özelliğiyle yazıya döker ve aynı
// anda ses kaydı alır (kayıt Supabase Storage'a yüklenir).

type TanimaSonucu = { isFinal: boolean; 0: { transcript: string } };
type TanimaOlayi = { resultIndex: number; results: ArrayLike<TanimaSonucu> };
type Tanima = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: TanimaOlayi) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
};
type TanimaSinifi = new () => Tanima;

function tanimaSinifi(): TanimaSinifi | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: TanimaSinifi; webkitSpeechRecognition?: TanimaSinifi };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const abonelikYok = () => () => {};

export type SesDurumu = "hazir" | "dinliyor" | "hata";

export function useSesliNot(metneEkle: (parca: string) => void) {
  const [durum, setDurum] = useState<SesDurumu>("hazir");
  const [araMetni, setAraci] = useState("");
  const [hata, setHata] = useState<string | null>(null);
  const tanima = useRef<Tanima | null>(null);
  const kaydedici = useRef<MediaRecorder | null>(null);
  const parcalar = useRef<Blob[]>([]);
  const kayitBitti = useRef<Promise<Blob | null> | null>(null);
  const ekle = useRef(metneEkle);
  useEffect(() => {
    ekle.current = metneEkle;
  });
  const destek = {
    tanima: useSyncExternalStore(abonelikYok, () => tanimaSinifi() !== null, () => false),
    kayit: useSyncExternalStore(
      abonelikYok,
      () => typeof MediaRecorder !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia),
      () => false,
    ),
  };

  const basla = useCallback(async () => {
    setHata(null);
    setAraci("");
    const Sinif = tanimaSinifi();
    if (Sinif) {
      const t = new Sinif();
      t.lang = "tr-TR";
      t.continuous = true;
      t.interimResults = true;
      t.onresult = (e) => {
        let ara = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const r = e.results[i];
          if (r.isFinal) ekle.current(r[0].transcript.trim());
          else ara += r[0].transcript;
        }
        setAraci(ara);
      };
      t.onerror = (e) => {
        if (e.error !== "no-speech" && e.error !== "aborted") setHata(`Konuşma tanıma hatası: ${e.error}`);
      };
      t.onend = () => setAraci("");
      tanima.current = t;
      try {
        t.start();
      } catch {
        tanima.current = null;
      }
    }

    if (typeof MediaRecorder !== "undefined" && navigator.mediaDevices?.getUserMedia) {
      try {
        const akis = await navigator.mediaDevices.getUserMedia({ audio: true });
        const k = new MediaRecorder(akis);
        parcalar.current = [];
        k.ondataavailable = (e) => e.data.size > 0 && parcalar.current.push(e.data);
        kayitBitti.current = new Promise((coz) => {
          k.onstop = () => {
            akis.getTracks().forEach((tr) => tr.stop());
            coz(parcalar.current.length ? new Blob(parcalar.current, { type: k.mimeType || "audio/webm" }) : null);
          };
        });
        k.start();
        kaydedici.current = k;
      } catch {
        if (!Sinif) {
          setHata("Mikrofona erişilemedi.");
          setDurum("hata");
          return;
        }
      }
    }
    setDurum("dinliyor");
  }, []);

  /** Dinlemeyi durdurur; ses kaydı varsa döner. */
  const dur = useCallback(async (): Promise<Blob | null> => {
    tanima.current?.stop();
    tanima.current = null;
    const k = kaydedici.current;
    kaydedici.current = null;
    setDurum("hazir");
    if (k && k.state !== "inactive") {
      k.stop();
      return (await kayitBitti.current) ?? null;
    }
    return null;
  }, []);

  useEffect(
    () => () => {
      tanima.current?.stop();
      if (kaydedici.current?.state === "recording") kaydedici.current.stop();
    },
    [],
  );

  return { durum, araMetin: araMetni, hata, destek, basla, dur };
}
