# LifeOS

İş hayatındaki her takibi tek bir gelen kutusunda toplayan kişisel hatırlatma ve takip uygulaması. Aklına gelen şeyi
5 saniyede yazarsın veya söylersin; Claude cümleyi ayrıştırır, sen tek dokunuşla onaylarsın, uygulama da doğru
zamanda sana geri getirir.

Telefona yüklenebilen bir web uygulamasıdır (PWA): Next.js 16 + Tailwind, Supabase (Postgres + Auth + Storage),
Claude API, Web Push.

## Neler var

| Modül | Ne yapar |
| --- | --- |
| **Hızlı giriş** | Her ekranda sabit **+** düğmesi, masaüstünde **N** veya **Ctrl/⌘+K**. Yazı ya da sesli not. Claude türü (görev, takip, bekleme, vade, not), firmayı, kişiyi, ürünü, tarihi ve tekrarı çıkarır. Onay kartı tek dokunuşla onaylanır veya düzeltilir; güven düşükse uyarı gösterir. Kart kapatılırsa kayıt gelen kutusunda bekler. |
| **Gelen kutusu** | İşlenmemiş kayıtlar. Güvenilir kayıtlar listeden tek dokunuşla onaylanır, diğerleri kartla düzeltilir. |
| **Görevler** | Yapacağım / Bekliyorum / Takip et sekmeleri; Açık / Ertelenen / Biten; arama; erteleme (yarın, 3 gün, haftaya, tarih); tekrar (her iş günü, haftalık, aylık, yıllık). |
| **Firmalar** | Liste, son temastan beri geçen gün, sessiz müşteri filtresi; firma sayfasında açık işler, bekleyenler, fırsatlar, notlar, kişiler ve hızlı not. Excel (.xlsx) ve CSV'den içe aktarma (Business Central başlıkları tanınır, aynı adlı firmalar atlanır). |
| **Fırsatlar** | Talep → Numune → Teklif → Müzakere → Sipariş / Kaybedildi panosu. Aşama değişince önceki aşamanın görevi kapanır, yeni aşamanın takip görevi açılır. |
| **Bugün** | Gecikenler (kırmızı), bugünküler, bekledikleriniz, sessiz müşteriler, işlenmemiş kayıt uyarısı. |
| **Bildirimler** | Her iş günü 08:30'da "bugünün 5 önceliği" özeti, vade günü 09:00 hatırlatmaları. Her bildirimde **Bitti / Ertele / Aç**. Günde en fazla 6 hatırlatma; fazlası özete ve Bugün ekranına kalır. |
| **Ayarlar** | Kural süreleri, özet ve hatırlatma saati, günlük sınır, aşama görevleri, ek tatil günleri, bildirim izni, içe aktarma. |

Telefonda ana ekran simgesine uzun basınca **Hızlı giriş** kısayolu çıkar. WhatsApp veya e-postadan **Paylaş → LifeOS**
ile metin doğrudan hızlı girişe düşer.

### Hatırlatma kuralları (varsayılanlar, Ayarlar'dan değişir)

| Tetikleyici | Ne zaman |
| --- | --- |
| Vadeli görev | Vade günü 09:00 |
| Bekliyorum | 5 iş günü sonra "dürt" |
| Teklif gönderildi | 3 iş günü sonra "dönüş geldi mi?" |
| Numune gönderildi | 14 gün sonra "geri bildirim iste" |
| Ödeme vadesi | 3 gün önce ve vade günü |
| Tarihsiz takip | 3 iş günü sonra |
| Sessiz müşteri | Aktif müşteride 30 gün temas yoksa; haftada bir (pazartesi) özette |
| Günlük özet | Her iş günü 08:30 |

Hafta sonuna ve Türkiye resmi tatillerine (2025–2027 dini bayramları dahil) düşen hatırlatmalar bir sonraki iş gününe
kayar. Sonraki yılların bayramlarını veya köprü günlerini Ayarlar → Ek tatil günleri'nden ekleyin.

Bir firmanın **son teması**; firmaya not eklendiğinde, firmaya bağlı bir görev bittiğinde veya teklif/numune
gönderimi girildiğinde otomatik ilerler.

## Kurulum

### 1. Supabase

1. [supabase.com](https://supabase.com)'da yeni proje açın.
2. SQL Editor'de sırayla çalıştırın:
   - `supabase/migrations/20261005000000_init.sql` (tablolar, RLS, tetikleyiciler)
   - `supabase/migrations/20261005000100_storage.sql` (sesli notlar için özel depolama)

   Supabase CLI kullanıyorsanız: `npx supabase link` ve `npx supabase db push`.
3. **Authentication → Users → Add user** ile kendi e-posta ve şifrenizi ekleyin.
   Uygulamada kayıt ekranı yoktur; **Authentication → Sign In / Providers**'da yeni kayıtları kapatın.

### 2. Anahtarlar

`.env.example` dosyasını `.env.local` olarak kopyalayıp doldurun:

| Değişken | Nereden |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` | Supabase → Project Settings → API Keys |
| `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com) → API Keys |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` | `npx web-push generate-vapid-keys` |
| `VAPID_SUBJECT` | `mailto:` + e-posta adresiniz |
| `CRON_SECRET` | `openssl rand -hex 32` |

Claude anahtarı yoksa uygulama yine çalışır; onay kartı elle doldurulur.

### 3. Yerel çalıştırma

```bash
npm install
npm run dev        # http://localhost:3000
```

### 4. Yayın (Vercel)

1. Depoyu Vercel'e bağlayın, `.env.local`'deki tüm değişkenleri **Settings → Environment Variables**'a ekleyin.
2. Yayından sonra hatırlatma motorunu zamanlayın: `supabase/cron.sql` dosyasındaki `<UYGULAMA_ADRESI>` ve `<CRON_SECRET>`
   değerlerini değiştirip Supabase SQL Editor'de bir kez çalıştırın. Supabase her 5 dakikada bir `/api/cron/tick`'i
   çağırır. (Vercel'in ücretsiz planındaki cron günde bir çalıştığı için yetmez.)

### 5. Telefona kurulum ve bildirimler

- **Android (Chrome):** Siteyi açın → menü → *Uygulamayı yükle*.
- **iPhone (iOS 16.4+):** Safari'de açın → Paylaş → *Ana Ekrana Ekle*. Bildirimler yalnızca ana ekrandan açılan
  uygulamada çalışır.
- Ardından **Ayarlar → Bildirim izni → Aç**. Her cihazı ayrı açın; deneme bildirimi gelir.

## Mimari

```
src/
  app/                 Sayfalar (Bugün, Gelen kutusu, Görevler, Firmalar, Fırsatlar, Ayarlar)
    actions/           Server action'lar (her biri oturum + zod doğrulaması yapar)
    api/cron/tick      Hatırlatma motoru (CRON_SECRET ile)
    api/push/action    Bildirimdeki Bitti/Ertele (imzalı, oturumsuz)
  components/          Arayüz (onay kartı, hızlı giriş, görev satırı, pano…)
  lib/
    dates.ts holidays.ts   Saat dilimi, iş günü, Türkiye tatilleri
    rules.ts               Hatırlatma kuralları, erteleme, tekrar, aşama görevleri
    engine.ts              Özet, günlük sınır, sessiz müşteri, bildirim metinleri
    inbox.ts match.ts      Onay kartı modeli, firma/kişi eşleştirme
    parse/                 Claude istemi ve sabit JSON şeması
    server/                Claude çağrısı, iş kuralları (ops), cron (tick), push, sorgular
supabase/
  migrations/          Şema + RLS + tetikleyiciler, depolama
  cron.sql             pg_cron + pg_net zamanlaması
public/sw.js           Service worker (push, bildirim düğmeleri)
```

**Claude ayrıştırma.** `src/lib/server/claude.ts` her girdi için `claude-opus-5-5` modeline yapılandırılmış çıktı
isteği gönderir (`output_config.format`, düşük efor). Sabit JSON biçimi:
`{tur, baslik, firma, kisi, urun, tarih, hatirlatma, guven}` + `olay` (hangi kural), `tekrar`, `ozet`, `aksiyonlar`
(toplantı notu). Hatırlatma zamanlarını model değil, `rules.ts` deterministik olarak hesaplar. Firma dizini sistem
isteminde gönderilir ve önbelleğe alınır. Güvenlik sınıflandırıcısı bir isteği reddederse sunucu tarafında önerilen
yedek modele düşer (`fallbacks: "default"`). Modeli `ANTHROPIC_MODEL` ile değiştirebilirsiniz.

**Sesli not.** Tarayıcının konuşma tanıma özelliği (Chrome, Safari, Edge) Türkçe yazıya döker; aynı anda alınan ses
kaydı Supabase Storage'da (`ses` klasörü, yalnızca sahibi erişir) saklanır ve gelen kutusundan dinlenebilir.
"Toplantı notu" işaretlenirse Claude özet ve aksiyon listesi çıkarır; seçilen aksiyonlar görev olur.

**Veri modeli.** Altı ana tablo (`inbox_items`, `companies`, `contacts`, `tasks`, `deals`, `notes`) ve yardımcı
tablolar (`settings`, `push_subscriptions`, `notification_log`). Her satır `user_id` ile sahibine bağlıdır; RLS
yalnızca sahibine gösterir ve bileşik yabancı anahtarlar bir kaydın başka kullanıcının firmasına bağlanmasını
engeller.

## Testler

```bash
npm test             # birim testleri: her hatırlatma kuralı, iş günü/tatil, özet, sınır, ayrıştırma, eşleştirme, içe aktarma
npm run typecheck
npm run lint
npm run test:e2e     # uçtan uca (Docker gerekir)
PGURL=postgresql://postgres@localhost:5432/postgres bash supabase/tests/calistir.sh   # şema/RLS (düz Postgres yeter)
```

`npm run test:e2e`, yerel Supabase'i (Docker) başlatır, uygulamayı derleyip 3100 portunda çalıştırır ve Claude API ile
push servisini taklit eden sunucularla PRD senaryolarının tamamını tarayıcıda dener: giriş, içe aktarma, her kural için
hızlı giriş, gelen kutusu, tekrar ve erteleme, aşama değişimi, son temas, özet ve günlük sınır, şifreli Web Push,
bildirimden Bitti/Ertele, sesli not kaydı. Gerçek projenize veya Claude API'ye dokunmaz. İlk çalıştırmadan önce bir kez
`npx playwright install chromium` gerekir.

## Kapsam dışı / sonraki adımlar

- **Ana ekran widget'ı:** Web uygulamaları telefonda widget ekleyemez. Yerine uygulama simgesine uzun basınca çıkan
  *Hızlı giriş* kısayolu ve *Paylaş → LifeOS* hedefi var.
- **Ses dosyasından yazıya sunucu tarafında çevirme yok:** Konuşma tanımayı desteklemeyen tarayıcılarda (ör. Firefox)
  ses saklanır ama metni elle yazmak gerekir.
- PRD yol haritası (v1.1+): Outlook/WhatsApp iletme, takvim, Business Central'dan otomatik vade/sipariş, haftalık
  rapor, kişisel alanlar.
