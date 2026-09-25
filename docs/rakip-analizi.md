# Rakip Analizi ve SEO Planı — Oğuz Klima

> Not: Rakip sitelere bu çalışma ortamından doğrudan erişim ağ politikası nedeniyle engellendi.
> Aşağıdaki analiz, arama motoru sonuçlarında görünen sayfa başlıkları, URL yapıları ve ürün listelerine dayanır.
> Siteler açılabildiğinde görsel/tasarım karşılaştırması ayrıca yapılmalıdır.

## 1. Rakipler

| Firma | Site | Öne çıkan ürünler | Gözlem |
|---|---|---|---|
| HTK Menfez | htk.com.tr | Menfez, difüzör, özel difüzör, helisel difüzör, dış hava panjuru, damper (yangın, geri akış, basınç tahliye), VAV/CAV, susturucu, döşeme konvektörü, aspiratör, ısı geri kazanım | Geniş gam. Her ürüne kod verilmiş (HTSK, HBTD, HDGD…) ve ayrı detay sayfası var — SEO açısından güçlü. |
| Mepa Klima | mepaklima.com.tr (1998'den beri) | Menfez, anemostat, panjur, müdahale ve kontrol kapakları, damper, jet nozul | Ürün başına ayrı `.html` sayfa. "Klima aksesuarları" konumlandırması. |
| Cenkay Teknik | cenkayteknik.com (2014) | Menfez, difüzör (perfore vb.), hava damperi, VAV damperi, katalog sayfası | Kategori/ürün URL'leri var, katalog indirme sayfası sunuyor. |

**Ortak noktalar:** üçü de ürün kodlu katalog mantığıyla çalışıyor, ağırlık metin + küçük ürün fotoğrafında.
**Fırsat:** daha görsel, teknik föy hissi veren, mobilde hızlı bir site ve her ürün için ayrı açılış sayfası.

## 2. Bu ilk sürümde yapılanlar

- Logodaki renkler (lacivert `#2F2483`, camgöbeği `#009EE3`) ile kurumsal tasarım.
- Ana sayfa: animasyonlu menfez çizimli hero, 6 ürün grubu, uygulama alanları, "neden biz", teknik föy örneği, teklif bandı.
- Ürünler sayfası: 6 grup / 25 ürün, her ürün için kod (OK-…), teknik çizim, 3 teknik özellik, "teklif iste" bağlantısı.
- Hakkımızda (6 adımlı üretim süreci) ve İletişim (teklif formu, WhatsApp, harita alanı).
- SEO: her sayfada özgün `title`/`description`, canonical, Open Graph, `LocalBusiness` + `Product` + `BreadcrumbList` yapılandırılmış verisi, `sitemap.xml`, `robots.txt`, Türkçe URL'ler.
- Ürün görselleri şimdilik kod ile çizilen teknik çizimlerdir; gerçek fotoğraflar gelince değiştirilecek.

## 3. Hedef anahtar kelimeler

| Öncelik | Anahtar kelime | Hedef sayfa |
|---|---|---|
| Yüksek | menfez, menfez imalatı, menfez fiyatları | urunler.html#menfezler → ileride `/menfez` |
| Yüksek | yangın damperi, hava damperi | `/yangin-damperi`, `/hava-ayar-damperi` |
| Yüksek | kare difüzör, swirl difüzör, lineer difüzör | `/difuzor` alt sayfaları |
| Orta | dış hava panjuru, kum tutuculu panjur | `/panjur` |
| Orta | müdahale kapağı, tavan müdahale kapağı | `/mudahale-kapagi` |
| Orta | jet nozul, VAV damper, susturucu | ilgili ürün sayfaları |
| Yerel | "menfez imalatı + şehir adı", "havalandırma ekipmanları + şehir" | Ana sayfa + Google İşletme Profili |

## 4. Sonraki adımlar (birlikte düzenlenecek)

1. **Firma bilgileri:** telefon, WhatsApp, e-posta, adres, alan adı, kuruluş yılı → `tools/build.py` içindeki `FIRMA` bölümü.
2. **Gerçek fotoğraflar:** her ürün için beyaz fonda 1 fotoğraf + üretimden / sahadan 5–10 fotoğraf (WebP, ~1600 px).
3. **Ürün detay sayfaları:** her ürüne ayrı URL (rakiplerin en güçlü SEO yanı). Kapasite/debi tabloları, PDF teknik föy.
4. **Referanslar:** tamamlanan projeler (proje adı, şehir, kullanılan ürünler, fotoğraf).
5. **Katalog:** indirilebilir PDF katalog.
6. **Google İşletme Profili** açılması ve Search Console'a `sitemap.xml` gönderilmesi.
7. **Form altyapısı:** teklif formunun hosting'e göre (PHP mail / form servisi) bağlanması; şu an e-posta uygulamasını açıyor.
8. **Blog/rehber içerikleri:** "Menfez ölçüsü nasıl hesaplanır?", "Yangın damperi nerede kullanılır?" gibi yazılar.
