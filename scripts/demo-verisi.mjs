// Demo kullanıcısını oluşturur ve örnek verilerle doldurur (yalnızca yerel Supabase).
// scripts/demo.sh tarafından çalıştırılır; her çalıştırmada demo verisi baştan kurulur.

import { createClient } from "@supabase/supabase-js";

export const DEMO_EPOSTA = "demo@lifeos.test";
export const DEMO_SIFRE = "demo-sifre-123";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anahtar = process.env.SUPABASE_SECRET_KEY;
if (!url || !anahtar) throw new Error("NEXT_PUBLIC_SUPABASE_URL ve SUPABASE_SECRET_KEY gerekli.");
if (!/^http:\/\/(127\.0\.0\.1|localhost)[:/]/.test(url)) throw new Error("Demo verisi yalnızca yerel Supabase'e yazılır.");

const db = createClient(url, anahtar, { auth: { persistSession: false } });
// Toplu eklemelerde defaultToNull: false → satırda olmayan sütun veritabanı varsayılanını alır.
const bekle = async (p) => {
  const { data, error } = await p;
  if (error) throw error;
  return data;
};

// İstanbul'a göre bugün ve göreli tarihler
const BUGUN = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(new Date());
const gun = (ekle) => {
  const d = new Date(BUGUN + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + ekle);
  return d.toISOString().slice(0, 10);
};
const an = (ekleGun, saat) => `${gun(ekleGun)}T${saat}:00+03:00`;
const ayinGunu = (n) => {
  const [y, a, g] = BUGUN.split("-").map(Number);
  const d = new Date(Date.UTC(y, a - 1 + (g >= n ? 1 : 0), n));
  return d.toISOString().slice(0, 10);
};

// Kullanıcı
const { users } = await bekle(db.auth.admin.listUsers({ perPage: 1000 }));
let id = users.find((u) => u.email === DEMO_EPOSTA)?.id;
if (!id) {
  const yeni = await bekle(
    db.auth.admin.createUser({ email: DEMO_EPOSTA, password: DEMO_SIFRE, email_confirm: true, user_metadata: { ad: "Demo" } }),
  );
  id = yeni.user.id;
} else {
  await bekle(db.auth.admin.updateUserById(id, { password: DEMO_SIFRE, user_metadata: { ad: "Demo", sifre_degistirmeli: false } }));
}
for (const t of ["notification_log", "push_subscriptions", "notes", "tasks", "deals", "contacts", "companies", "inbox_items", "email_log"]) {
  await bekle(db.from(t).delete().eq("user_id", id));
}
await bekle(
  db.from("settings").upsert({ user_id: id, kurallar: {}, ek_tatiller: [], eposta_gondericiler: ["ad.soyad@buteo.example"] }),
);

// Firmalar ve kişiler
const firmalar = await bekle(
  db
    .from("companies")
    .insert([
      { user_id: id, ad: "Acme Plastik A.Ş.", tur: "musteri", ulke: "TR", segment: "Enjeksiyon", eposta_alanlari: ["acme-plastik.example"] },
      { user_id: id, ad: "Delta Polimer GmbH", tur: "musteri", ulke: "DE", segment: "Compound", eposta_alanlari: ["delta-polimer.example"] },
      { user_id: id, ad: "Ege Film Ltd.", tur: "musteri", ulke: "TR", segment: "Film" },
      { user_id: id, ad: "Marmara Kauçuk", tur: "musteri", ulke: "TR", segment: "Kauçuk" },
      { user_id: id, ad: "Yıldız Ambalaj", tur: "aday", ulke: "TR", segment: "Ambalaj" },
      { user_id: id, ad: "Basechem", tur: "tedarikci", ulke: "NL" },
    ], { defaultToNull: false })
    .select("id, ad"),
);
const F = Object.fromEntries(firmalar.map((f) => [f.ad.split(" ")[0], f.id]));

const kisiler = await bekle(
  db
    .from("contacts")
    .insert([
      { user_id: id, company_id: F.Acme, ad: "Ali Demir", unvan: "Satın alma müdürü", eposta: "ali.demir@acme-plastik.example", dil: "tr" },
      { user_id: id, company_id: F.Acme, ad: "Ayşe Kaya", unvan: "Ar-Ge", dil: "tr" },
      { user_id: id, company_id: F.Delta, ad: "Jonas Weber", unvan: "Einkauf", eposta: "j.weber@delta-polimer.example", dil: "en" },
      { user_id: id, company_id: F.Ege, ad: "Murat Çelik", unvan: "Üretim müdürü", dil: "tr" },
      { user_id: id, company_id: F.Marmara, ad: "Selin Aydın", unvan: "Satın alma", dil: "tr" },
    ], { defaultToNull: false })
    .select("id, ad"),
);
const K = Object.fromEntries(kisiler.map((k) => [k.ad.split(" ")[0], k.id]));

// Fırsatlar
const firsatlar = await bekle(
  db
    .from("deals")
    .insert([
      { user_id: id, company_id: F.Acme, urun: "Lucon", asama: "teklif", tahmini_miktar_ton: 60, tahmini_tutar: 78000, para_birimi: "USD", asama_tarihi: gun(-6) },
      { user_id: id, company_id: F.Delta, urun: "Exceed", asama: "muzakere", tahmini_miktar_ton: 120, tahmini_tutar: 180000, para_birimi: "EUR", asama_tarihi: gun(-12) },
      { user_id: id, company_id: F.Ege, urun: "Vistamaxx", asama: "numune", tahmini_miktar_ton: 5, para_birimi: "USD", asama_tarihi: gun(-3) },
      { user_id: id, company_id: F.Yıldız, urun: "Escorene", asama: "talep", tahmini_miktar_ton: 20, para_birimi: "USD", asama_tarihi: gun(-1) },
      { user_id: id, company_id: F.Marmara, urun: "Vistamaxx", asama: "siparis", tahmini_miktar_ton: 40, tahmini_tutar: 64000, para_birimi: "USD", asama_tarihi: gun(-45) },
    ], { defaultToNull: false })
    .select("id, urun, company_id"),
);
const D = (urun, firma) => firsatlar.find((f) => f.urun === urun && f.company_id === firma).id;

// Notlar (son temas tarihleri notlardan ve biten işlerden hesaplanır)
await bekle(
  db.from("notes").insert([
    { user_id: id, company_id: F.Marmara, metin: "Sezon kapanışı; yeni yıl planını Ocak'ta konuşalım dediler.", ozet: "Yeni sezon planı Ocak'ta", tarih: an(-41, "11:00") },
    { user_id: id, company_id: F.Delta, deal_id: D("Exceed", F.Delta), metin: "Jonas ile telefon: Exceed için 120 t yıllık; fiyat %4 yüksek bulundu, revize teklif istiyorlar.", ozet: "Exceed 120 t; revize fiyat isteniyor", tarih: an(-12, "11:30") },
    { user_id: id, company_id: F.Acme, deal_id: D("Lucon", F.Acme), metin: "Ziyaret: Ali Bey ve Ayşe Hanım ile Lucon'u mevcut malzemeyle karşılaştırdık. Deneme üretimi olumlu; fiyat bekliyorlar.", ozet: "Lucon denemesi olumlu, fiyat bekleniyor", tarih: an(-6, "15:00") },
    { user_id: id, company_id: F.Delta, deal_id: D("Exceed", F.Delta), metin: "Gönderilen e-posta: Exceed revize teklif\nKime: j.weber@delta-polimer.example\nEkler: Exceed_teklif.pdf\n\nDear Jonas, please find our revised offer attached.", ozet: "E-posta gönderildi: Exceed revize teklif", tarih: an(0, "09:12") },
  ], { defaultToNull: false }),
);

// Görevler
await bekle(
  db.from("tasks").insert([
    { user_id: id, baslik: "Ali'ye Lucon fiyatını dön", tur: "yapacagim", vade: gun(-2), company_id: F.Acme, contact_id: K.Ali, deal_id: D("Lucon", F.Acme) },
    { user_id: id, baslik: "Delta'dan revize teklife dönüş geldi mi?", tur: "takip", vade: gun(0), hatirlatma_zamani: an(0, "14:00"), company_id: F.Delta, contact_id: K.Jonas, deal_id: D("Exceed", F.Delta) },
    { user_id: id, baslik: "Vistamaxx numunesi için geri bildirim iste", tur: "takip", vade: gun(2), company_id: F.Ege, contact_id: K.Murat, deal_id: D("Vistamaxx", F.Ege) },
    { user_id: id, baslik: "Escorene için teknik bilgi formu gönder", tur: "yapacagim", vade: gun(1), company_id: F.Yıldız, deal_id: D("Escorene", F.Yıldız) },
    { user_id: id, baslik: "TDS gelecek", tur: "bekliyorum", vade: gun(3), company_id: F.Basechem },
    { user_id: id, baslik: "Aylık stok raporu", tur: "yapacagim", vade: ayinGunu(5), tekrar_kurali: "aylik:5" },
    { user_id: id, baslik: "Marmara Kauçuk'u ara, yeni sezon planını sor", tur: "yapacagim", company_id: F.Marmara, contact_id: K.Selin },
    { user_id: id, baslik: "Acme'ye Lucon TDS gönder", tur: "yapacagim", durum: "bitti", vade: gun(-7), tamamlanma: an(-6, "17:20"), company_id: F.Acme, deal_id: D("Lucon", F.Acme) },
  ], { defaultToNull: false }),
);

// Gelen kutusu: biri e-postayla gelmiş üç işlenmemiş kayıt
const ayristirma = (p) => ({ tur: "gorev", firma: null, kisi: null, urun: null, tarih: null, hatirlatma: null, guven: 0.9, olay: "yok", tekrar: null, ozet: null, aksiyonlar: [], ...p });
await bekle(
  db.from("inbox_items").insert([
    {
      user_id: id,
      created_at: an(0, "08:40"),
      ham_metin: "Yıldız Ambalaj Escorene numunesi istedi galiba, sor",
      ayristirma_json: ayristirma({ baslik: "Yıldız Ambalaj'a Escorene numunesini sor", firma: "Yıldız Ambalaj", urun: "Escorene", guven: 0.55 }),
    },
    {
      user_id: id,
      created_at: an(0, "09:05"),
      ham_metin: "Ege Film'e Vistamaxx numunesi kargolandı",
      ayristirma_json: ayristirma({ tur: "takip", baslik: "Vistamaxx numunesi kargo takibi", firma: "Ege Film Ltd.", urun: "Vistamaxx", olay: "numune_gonderildi", guven: 0.92 }),
    },
    {
      user_id: id,
      created_at: an(0, "09:31"),
      kaynak: "eposta",
      ham_metin:
        "yarın dönüş yap\n\n[E-posta] Lucon fiyat talebi\nKimden: Ali Demir <ali.demir@acme-plastik.example>\nTarih: " +
        gun(0) +
        "\n\nMerhaba, 60 ton Lucon için güncel fiyatınızı ve teslim süresini rica ederiz.",
      eposta: {
        yon: "iletilen",
        konu: "Lucon fiyat talebi",
        karsi_taraf: ["ali.demir@acme-plastik.example"],
        orijinal_gonderen: { adres: "ali.demir@acme-plastik.example", ad: "Ali Demir" },
        tarih: gun(0),
        ekler: [],
      },
      ayristirma_json: ayristirma({ baslik: "Ali'ye 60 ton Lucon fiyatı ve teslim süresi gönder", firma: "Acme Plastik A.Ş.", kisi: "Ali Demir", urun: "Lucon", tarih: gun(1), guven: 0.88 }),
    },
  ], { defaultToNull: false }),
);

// E-posta günlüğü (Ayarlar → E-posta bağlantısı)
await bekle(
  db.from("email_log").insert([
    { user_id: id, alinma: an(0, "08:02"), message_id: "demo-3", gonderen: "kampanya@reklam.example", konu: "Büyük indirim!", sonuc: "reddedildi", aciklama: "kampanya@reklam.example izinli gönderenler arasında değil (Ayarlar → E-posta)" },
    { user_id: id, alinma: an(0, "09:12"), message_id: "demo-2", gonderen: "ad.soyad@buteo.example", konu: "Exceed revize teklif", sonuc: "not", aciklama: "Firmaya not eklendi: Delta Polimer GmbH" },
    { user_id: id, alinma: an(0, "09:31"), message_id: "demo-1", gonderen: "ad.soyad@buteo.example", konu: "İlt: Lucon fiyat talebi", sonuc: "gelen_kutusu", aciklama: "Gelen kutusuna eklendi (ali.demir@acme-plastik.example)" },
  ], { defaultToNull: false }),
);

console.log(`Demo verisi hazır: ${DEMO_EPOSTA} / ${DEMO_SIFRE}`);
