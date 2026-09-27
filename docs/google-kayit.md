# Google'da Görünme Rehberi — Oğuz Klima

Sitede Google'ın firmanızı tanıması için gereken her şey hazır:
- Her sayfada firma bilgileri (unvan, adres, telefonlar, e-posta, kuruluş yılı, çalışma saatleri) Google'ın okuduğu **yapılandırılmış veri** olarak var (`HVACBusiness`).
- `sitemap.xml` ve `robots.txt` hazır.
- İletişim sayfasında Google Haritalar konumu ve "Yol tarifi al" bağlantısı var.

Ancak **Google Haritalar'da konumunuzun çıkması** ve "menfez üreticisi Üsküdar" gibi aramalarda harita kutusunda görünmeniz için
aşağıdaki adımları sizin yapmanız gerekir. Bunlar Google hesabınızla yapılan işlemlerdir.

## 1. Google İşletme Profili (en önemli adım)
1. https://business.google.com adresine girin ve "Şimdi yönetin" deyin.
2. İşletme adı: **Oğuz Klima Havalandırma** (tabela ve faturadaki adla aynı olsun).
3. Kategori: **Havalandırma ekipmanları tedarikçisi** (ek kategori: "Klima sistemi tedarikçisi", "Metal imalatçısı").
4. Adres: **Yavuztürk Mah. Tarih Cad. No: 10, 34692 Üsküdar / İstanbul** — haritadaki iğneyi binanın tam üstüne taşıyın.
5. Telefon: **0216 421 55 15**, web sitesi: alan adınız.
6. Google doğrulama ister (kartpostal, telefon veya video). Doğrulama bitince profil haritada görünür.
7. Profile ekleyin: çalışma saatleri, logo, ürün ve atölye fotoğrafları (en az 10), kısa açıklama, ürünler.
8. Müşterilerinizden Google yorumu isteyin; yorumlar yerel aramada sıralamayı en çok etkileyen şeylerden biridir.

## 2. Google Search Console
1. https://search.google.com/search-console → "Mülk ekle" → alan adınızı girin.
2. Doğrulama için verilen DNS kaydını alan adınızın paneline ekleyin (veya HTML etiketi yöntemini seçin; etiketi bana iletirseniz siteye eklerim).
3. "Site haritaları" bölümüne `sitemap.xml` yazıp gönderin.
4. "URL denetimi" ile ana sayfayı girip "Dizine eklenmeyi iste" deyin.

## 3. Bilgi tutarlılığı
Google firmanızı adres, telefon ve adın her yerde **birebir aynı** yazılmasından tanır. Web sitesi, Google İşletme Profili,
firma rehberleri (Yandex Haritalar, Apple Haritalar, sektör rehberleri) ve sosyal medyada aynı yazımı kullanın:

```
Oğuz Klima Havalandırma İnşaat San. ve Tic. Ltd. Şti.
Yavuztürk Mah. Tarih Cad. No: 10, 34692 Üsküdar / İstanbul
0216 421 55 15 · info@oguzklima.com
```

## 4. Teklif formu (bir kerelik onay)
Sitedeki teklif formları **FormSubmit** servisi ile `info@oguzklima.com` adresine e-posta olarak gönderilir.
Site yayına alındıktan sonra formu bir kez kendiniz doldurup gönderin. `info@oguzklima.com` adresine FormSubmit'ten
**"Activate Form"** başlıklı bir e-posta gelir. İçindeki bağlantıya tıkladığınızda form çalışmaya başlar.
(Gelmezse spam klasörüne bakın.)

## 5. Kontrol edilecekler
- Alan adı `oguzklima.com` olarak ayarlandı (e-posta adresinize göre). Farklıysa `tools/build.py` → `FIRMA["domain"]`.
- Çalışma saatleri "Pazartesi – Cumartesi 08:30 – 18:00" olarak duruyor; doğru değilse söyleyin.
