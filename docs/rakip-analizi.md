# Rakip ve Sektör Analizi, SEO Planı — Oğuz Klima

> **Yöntem notu:** Bu çalışma ortamının ağ politikası rakip sitelere doğrudan erişimi engelledi.
> Analiz; arama motoru sonuçlarındaki sayfa başlıkları, URL yapıları, ürün listeleri ve firmaların
> kendilerini tanıttığı metinlere dayanır. Sitelerin renk/fotoğraf kullanımı doğrudan incelenemedi.

## 1. Doğrudan rakipler (sizin verdikleriniz)

| Firma | Site | Öne çıkan ürünler | Gözlem |
|---|---|---|---|
| HTK Menfez | htk.com.tr | Menfez, difüzör, helisel difüzör, panjur, damperler, VAV/CAV, susturucu, döşeme konvektörü, aspiratör, ısı geri kazanım | Her ürün kodlu (HTSK, HBTD, HDGD…) ve ayrı detay sayfalı. SEO'da en güçlü rakip. |
| Mepa Klima | mepaklima.com.tr (1998) | Menfez, anemostat, panjur, müdahale kapağı, damper, jet nozul | Ürün başına ayrı sayfa, "klima aksesuarları" konumlandırması. |
| Cenkay Teknik | cenkayteknik.com (2014) | Menfez, difüzör, hava damperi, VAV damperi | Kategori URL'leri ve katalog sayfası var. |

## 2. Sektörün öne çıkan firmaları

| Firma | Konum | Sitelerinden öne çıkan yaklaşım |
|---|---|---|
| **Systemair HSK** (systemair.com/tr-tr) | 1981'de kuruldu, 2012'den beri İsveçli Systemair grubunda. Bölgenin en büyük klima santrali fabrikalarından biri, ~300 kişilik ekip. | Uluslararası kurumsal dil; ürün seçim araçları, teknik doküman merkezi, referans projeler. |
| **TROX Türkiye** (trox.com.tr) | Difüzör/menfez alanında dünya markası. | Ürün grupları büyük görsellerle, her üründe teknik veri, test ve tasarım vurgusu. |
| **Daikin Türkiye** (daikin.com.tr) | "Doğru Hava Uzmanı" sloganı. | Güçlü marka sloganı, otel/hastane/AVM referans kataloğu (Issuu üzerinden). |
| **Alarko Carrier** | Köklü yerli marka. | Referans projeler ayrı sayfalarda, fotoğraflı. |
| **Friterm** (friterm.com) | Endüstriyel iklimlendirme. | "Zirveye giden yolda güvenilir çözüm ortağınız" gibi duygusal bir slogan. |
| **A-TEC** (a-tec.com.tr) | 1996'dan beri menfez, difüzör, panjur ve damper üretiyor. | Ürün grubu bazlı net menü; Ar-Ge ve yatırım vurgusu. |
| **Birlik Menfez** (birlikmenfez.com) | 32+ yıllık üretim deneyimi. | Çok dilli site, deneyim yılı vurgusu. |
| **BSK Havalandırma** (bskhvac.com.tr) | Menfez, difüzör, yangın/VAV damperi, ısı geri kazanım, klima santrali. | Geniş ürün yelpazesi, İngilizce sürüm. |
| **MENSAN** (menfezcesitleri.com) | Alüminyum menfez, panjur, difüzör, damper. | Blog tarzı SEO içerikleri ("Havalandırma sistemleri için difüzörler" gibi). |
| **Emsa Havalandırma** | Difüzör, helisel difüzör, damper, VAV. | Endüstriyel konumlandırma. |

### Sektördeki ortak kalıplar ve sizin için fırsatlar

1. **Referans / proje sayfası** neredeyse herkeste var ve güven için en etkili bölüm. → **Projeler** sayfası eklendi.
2. **Deneyim yılı ve rakamlar** (32 yıl, 300 kişi, en büyük fabrika) öne çıkarılıyor. → Rakam bandı eklendi; kuruluş yılınızı ekleyelim.
3. **Kodlu ürünler ve teknik föy** büyük markaların standardı. → OK-… kodları ve teknik föy kartı var.
4. **Blog / rehber içerikleri** (MENSAN) uzun kuyruk aramalardan trafik çekiyor. → Sonraki adım.
5. **Sektör sitelerinin çoğu koyu, kurumsal ve metin ağırlıklı.** → Oğuz Klima aydınlık, renkli ve illüstrasyonlu tasarımıyla ayrışıyor.

## 3. Bu sürümde yapılanlar

- **Aydınlık tasarım:** beyaz ve gökyüzü mavisi zemin; logonun lacivert ve camgöbeğine ek olarak nane yeşili, güneş sarısı, mercan ve lila vurgu renkleri.
- **Bol görsel:** ana sayfada hareketli bina kesiti (çatıda klima santrali; ofis, hastane, AVM ve otel katları; bodrumda otopark), 6 uygulama alanı sahnesi, renkli ürün kartları ve çizimleri.
- **Projeler sayfası:** sektöre göre filtre, tıklanınca açılan detay penceresi ve fotoğraf galerisi. Ana sayfada da 6 proje gösteriliyor.
- SEO: her sayfada özgün başlık ve açıklama, yapılandırılmış veri, `sitemap.xml`.

## 4. Projelerinizi ekleme

1. `tools/build.py` içindeki `PROJELER` listesinde örnek kayıtları gerçek projelerinizle değiştirin (başlık, sektör, şehir, yıl, açıklama, kullanılan ürünler). `"ornek": True` satırını silin.
2. Her proje için `assets/img/projeler/<slug>/` klasörü açıp fotoğrafları `01.jpg`, `02.jpg`… adıyla koyun.
3. `python3 tools/build.py` çalıştırın. Kapak fotoğrafı, galeri ve fotoğraf sayısı otomatik oluşur.

Bana fotoğrafları ve proje bilgilerini gönderirseniz bunu ben de yapabilirim.

## 5. Hedef anahtar kelimeler

| Öncelik | Anahtar kelime | Hedef sayfa |
|---|---|---|
| Yüksek | menfez, menfez imalatı, menfez fiyatları | urunler.html#menfezler → ileride `/menfez` |
| Yüksek | yangın damperi, hava damperi | `/yangin-damperi`, `/hava-ayar-damperi` |
| Yüksek | kare difüzör, swirl difüzör, lineer difüzör | `/difuzor` alt sayfaları |
| Orta | dış hava panjuru, kum tutuculu panjur | `/panjur` |
| Orta | müdahale kapağı, jet nozul, VAV damper, susturucu | ilgili ürün sayfaları |
| Yerel | "menfez imalatı + şehir", "havalandırma ekipmanları + şehir" | Ana sayfa + Google İşletme Profili |

## 6. Sonraki adımlar

1. Firma bilgileri (telefon, WhatsApp, e-posta, adres, alan adı, kuruluş yılı) → `tools/build.py` → `FIRMA`.
2. Gerçek proje bilgileri ve fotoğrafları.
3. Ürün fotoğrafları (beyaz fonda, WebP, ~1600 px), çizimlerin yerine.
4. Her ürün için ayrı detay sayfası ve PDF teknik föy.
5. Referans firma logoları bandı (çalıştığınız taahhüt firmaları).
6. Blog/rehber içerikleri, Google İşletme Profili, Search Console.
7. Teklif formunun hosting'e göre bir gönderim servisine bağlanması.
