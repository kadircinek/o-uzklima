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
| **E-posta** | Her kullanıcıya özel LifeOS adresi. E-postayı bu adrese **ilet** → gelen kutusuna düşer, Claude ayrıştırır. Müşteriye yazarken **gizli kopya (BCC)** ekle → firmaya not düşer, son temas güncellenir. Gönderen adresinin alan adı firmayla eşleştirilir ve onaylandıkça öğrenilir. |
| **Ekip** | Yönetici, ofisteki arkadaşlarına Ayarlar'dan hesap açar (geçici şifre, iPhone kurulum mesajı, QR kod). Herkesin verisi kendine özeldir. |
| **Ayarlar** | Kural süreleri, özet ve hatırlatma saati, günlük sınır, aşama görevleri, ek tatil günleri, bildirim izni, e-posta bağlantısı, ekip, şifre, içe aktarma. |

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

## Hemen dene: demo ve iPad Pro simülatörü

Hesap veya anahtar gerekmeden, örnek verilerle (Acme, Delta Polimer, Ege Film… firmaları, görevler, fırsatlar ve
e-postayla gelmiş bir kayıt) yerelde açmak için Docker ve Node yeter:

```bash
npm install
npm run demo       # http://localhost:3000 · giriş: demo@lifeos.test / demo-sifre-123
```

Mac'te terminal kullanmadan: klasördeki **LifeOS Demo.command** dosyasına çift tıklayın. Eksikse Node.js ve Docker
Desktop'ın indirme sayfasını açar; hazırsa demo'yu başlatır ve uygulamayı iPad Pro simülatöründe (Xcode yoksa
tarayıcıdaki iPad Pro görünümünde) açar. macOS ilk açılışta "doğrulanamadı" derse dosyaya sağ tıklayıp **Aç**'ı seçin.

Demo yerel bir Supabase başlatır ve Claude'u taklit eder: bilinen örnek cümleler ("Ege Film'e Vistamaxx numunesi
kargolandı", "Basechem'den TDS bekliyorum"…) ayrıştırılır, diğerleri olduğu gibi görev olur. Gerçek Claude ile denemek
için `ANTHROPIC_API_KEY=sk-ant-... npm run demo`. Gerçek Supabase projenize dokunmaz; `Ctrl+C` ile kapanır, yerel
Supabase `npx supabase stop` ile durur.

**iPad Pro görünümü (her tarayıcıda):** `/simulator` sayfası uygulamayı iPad Pro 11 veya 13 inç ekran ölçülerinde,
ana ekrana eklenmiş uygulama gibi bir çerçevede açar. **Döndür** (ya da **R** tuşu) dikey/yatay geçer; gezdiğiniz sayfa
adreste kalır. Demo'da `http://localhost:3000/simulator`, yayında `https://<uygulama-adresi>/simulator`.

**Gerçek iPad simülatörü (Mac + Xcode):** Uygulama çalışırken ikinci bir terminalde

```bash
npm run ipad                                  # iPad Pro 13 inç, http://localhost:3000
npm run ipad -- --11                          # iPad Pro 11 inç
npm run ipad -- https://<uygulama-adresi>     # yayındaki uygulama
```

Komut Xcode'daki en yeni iPad Pro simülatörünü başlatır ve uygulamayı Safari'de açar. Safari'de Paylaş → **Ana Ekrana
Ekle** ile uygulama gibi açılır; Simulator'da ⌘← / ⌘→ döndürür. Xcode yoksa App Store'dan kurup bir kez açın ve
**Settings → Components**'tan iOS simülatörünü indirin. Gerçek iPad'de denemek için yayındaki adresi Safari'de açmak
yeter.

## Kurulum

### 1. Supabase

1. [supabase.com](https://supabase.com)'da yeni proje açın.
2. SQL Editor'de sırayla çalıştırın:
   - `supabase/migrations/20261005000000_init.sql` (tablolar, RLS, tetikleyiciler)
   - `supabase/migrations/20261005000100_storage.sql` (sesli notlar için özel depolama)
   - `supabase/migrations/20261006000000_eposta.sql` (e-posta bağlantısı)

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
| `EPOSTA_GELEN_ADRESI`, `EPOSTA_WEBHOOK_ANAHTARI` | Postmark (aşağıda **E-posta**) |
| `YONETICI_EPOSTALARI` | Arkadaşlarına hesap açabilecek yönetici e-postaları (virgülle) |

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

### 6. E-posta bağlantısı (Postmark)

Postmark, LifeOS adresine gelen e-postaları uygulamaya iletir. Alan adı veya BT desteği gerekmez.

1. [postmarkapp.com](https://postmarkapp.com)'da hesap açın → **Servers → Create server** ("LifeOS").
2. Sunucunun **Default Inbound Stream → Settings** sayfasındaki gelen adresini (`…@inbound.postmarkapp.com`)
   `EPOSTA_GELEN_ADRESI` olarak tanımlayın.
3. `EPOSTA_WEBHOOK_ANAHTARI` için rastgele bir değer üretin (`openssl rand -hex 24`) ve aynı sayfadaki **Webhook**
   alanına şunu yazın: `https://lifeos:<EPOSTA_WEBHOOK_ANAHTARI>@<uygulama-adresi>/api/eposta/gelen`
4. Vercel'de iki değişkeni ekleyip yeniden yayınlayın. **Ayarlar → E-posta bağlantısı**'nda herkes kendi adresini görür.

Kullanım (her kullanıcı kendi adresiyle):

- **İlet:** Takip edilecek e-postayı LifeOS adresine iletin; en üste not yazabilirsiniz ("perşembe dönüş yap").
  Gelen kutusuna düşer, Claude görevi çıkarır, siz onaylarsınız.
- **Gizli kopya (BCC):** Müşteriye yazarken LifeOS adresini Bcc'ye ekleyin. E-posta alıcının firmasına not olarak
  düşer ve son temas güncellenir; firma bilinmiyorsa gelen kutusuna düşer.
- **Kendine not:** LifeOS adresine doğrudan yazılan e-posta hızlı giriş gibi işlenir.
- Yalnızca kullanıcının giriş e-postasından ve **Ayarlar → Kabul edilen gönderenler**'e eklediği adreslerden
  (ör. `ad@buteo.com.tr`) gelen e-postalar kabul edilir. **Son gelen e-postalar** listesi neyin işlendiğini gösterir.
- Firmalar e-posta alan adlarıyla (ör. `acme.com`) eşleşir. Alan adı firma formundan girilebilir; e-postadan gelen bir
  kaydı bir firmaya bağlayıp onayladığınızda da kendiliğinden öğrenilir. Genel servisler (gmail, hotmail…) ve kendi
  şirket alan adınız eşleştirmede yok sayılır.
- Microsoft 365'te dış adrese **otomatik** yönlendirme kuralları şirket yöneticisi tarafından kapatılmış olabilir; elle
  iletme ve Bcc bundan etkilenmez.
- Postmark'ın ücretsiz planı düşük hacimlidir; ekipçe kullanımda Postmark'ın güncel fiyatlarına bakın.

### 7. Ekip (ofisteki arkadaşlar)

1. `YONETICI_EPOSTALARI`'na kendi adresinizi yazın (birden fazlaysa virgülle).
2. **Ayarlar → Ekip → Hesap aç**: ad ve e-posta girin. Geçici şifreli kurulum mesajı ve uygulama adresinin QR kodu
   gösterilir; **WhatsApp ile gönder** veya **Mesajı kopyala**.
3. Arkadaşınız iPhone'da Safari ile adresi açar → Paylaş → **Ana Ekrana Ekle** → giriş yapar → ilk girişte kendi
   şifresini belirler → Ayarlar'dan bildirimleri ve e-posta adresini kurar.
4. Şifresini unutan için **Şifre sıfırla**, ayrılan için **Kaldır** (o kişinin tüm LifeOS verisi silinir).

Her kullanıcının görevleri, firmaları, fırsatları, e-postaları ve bildirimleri kendine özeldir; hesap açmak veri
paylaşmak değildir. Claude API kullanımı tek anahtar üzerinden faturalanır.

## Mimari

```
src/
  app/                 Sayfalar (Bugün, Gelen kutusu, Görevler, Firmalar, Fırsatlar, Ayarlar)
    simulator/         Tarayıcıda iPad Pro çerçevesi (oturumsuz açılır, veri içermez)
    actions/           Server action'lar (her biri oturum + zod doğrulaması yapar)
    api/cron/tick      Hatırlatma motoru (CRON_SECRET ile)
    api/push/action    Bildirimdeki Bitti/Ertele (imzalı, oturumsuz)
    api/eposta/gelen   Postmark gelen e-posta webhook'u (Basic Auth)
  components/          Arayüz (onay kartı, hızlı giriş, görev satırı, pano…)
  lib/
    dates.ts holidays.ts   Saat dilimi, iş günü, Türkiye tatilleri
    rules.ts               Hatırlatma kuralları, erteleme, tekrar, aşama görevleri
    engine.ts              Özet, günlük sınır, sessiz müşteri, bildirim metinleri
    inbox.ts match.ts      Onay kartı modeli, firma/kişi eşleştirme
    eposta.ts              İletilen e-postayı ayırma, BCC tanıma, alan adıyla firma eşleştirme
    simulator.ts           iPad Pro ölçüleri, ekrana sığdırma, çerçeve yolu denetimi
    parse/                 Claude istemi ve sabit JSON şeması
    server/                Claude çağrısı, iş kuralları (ops), cron (tick), push, e-posta, ekip, sorgular
supabase/
  migrations/          Şema + RLS + tetikleyiciler, depolama
  cron.sql             pg_cron + pg_net zamanlaması
public/sw.js           Service worker (push, bildirim düğmeleri)
scripts/
  demo.sh demo-verisi.mjs  Tek komutla örnek verili yerel demo
  ipad-simulator.mjs       Mac'te Xcode iPad Pro simülatörünü açar
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
tablolar (`settings`, `push_subscriptions`, `notification_log`, `email_log`). Her satır `user_id` ile sahibine bağlıdır; RLS
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
bildirimden Bitti/Ertele, sesli not kaydı, Postmark biçiminde iletilen/BCC e-postalar, ekip hesabı açma ve ilk girişte
şifre belirleme, iPad Pro simülatörü. Gerçek projenize veya Claude API'ye dokunmaz. İlk çalıştırmadan önce bir kez
`npx playwright install chromium` gerekir.

## Kapsam dışı / sonraki adımlar

- **Ana ekran widget'ı:** Web uygulamaları telefonda widget ekleyemez. Yerine uygulama simgesine uzun basınca çıkan
  *Hızlı giriş* kısayolu ve *Paylaş → LifeOS* hedefi var.
- **Ses dosyasından yazıya sunucu tarafında çevirme yok:** Konuşma tanımayı desteklemeyen tarayıcılarda (ör. Firefox)
  ses saklanır ama metni elle yazmak gerekir.
- **Ortak veri yok:** Ekip üyeleri aynı firma listesini veya fırsatları paylaşmaz; her biri kendi LifeOS'unu kullanır.
- **Outlook'a doğrudan bağlantı (Microsoft Graph) yok:** E-postalar iletme/Bcc ile gelir; posta kutusu okunmaz.
- PRD yol haritası (v1.1+): takvim, Business Central'dan otomatik vade/sipariş, haftalık rapor, kişisel alanlar.
