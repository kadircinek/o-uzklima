# Oğuz Klima Web Sitesi — Teslim Notları

Bu paket, Oğuz Klima Havalandırma İnşaat San. ve Tic. Ltd. Şti. için hazırlanan kurumsal sitenin tamamıdır.
Site **statik HTML/CSS/JS**'tir; veritabanı, PHP veya framework gerektirmez. Her standart hosting'e yüklenebilir.

## Hızlı başlangıç

- **Yayına almak:** Klasördeki dosyaların tamamını (aşağıdaki "yüklenmeyecekler" hariç) hosting'in kök dizinine
  (`public_html`, `www` vb.) yükleyin. `index.html` ana sayfadır.
- **Yerelde görmek:** Klasörde `python3 -m http.server` → http://localhost:8000
  (Dosyayı çift tıklayıp açmak da çalışır; ama form ve harita için sunucu üzerinden açın.)

## Klasör yapısı

```
index.html, urunler.html, projeler.html,
hakkimizda.html, iletisim.html          Sayfalar (tools/build.py ile üretilir)
assets/css/style.css                    Tüm stiller; renk ve yazı tipi değişkenleri en üstte (:root)
assets/js/main.js                       Menü, slayt gösterisi, ürün teknik çizimleri (SVG),
                                        proje galerisi, teklif formu gönderimi
assets/img/                             Logolar (SVG + PNG), favicon
assets/img/slider/                      Ana sayfa slayt fotoğrafları
assets/img/projeler/<proje>/            Proje fotoğrafları (01.jpg, 02.jpg …)
sitemap.xml, robots.txt                 SEO dosyaları
tools/build.py                          Sayfa üretici (Python 3, ek paket gerekmez)
docs/                                   Rakip analizi, Google kayıt rehberi
```

**Yüklenmeyecekler:** `tools/`, `docs/`, `README.md`, bu not dosyası. (Yüklenmeleri zarar vermez ama gerekmez.)

## İçerik nasıl düzenlenir

Sayfalardaki ortak alanlar (üst menü, alt bilgi, iletişim bilgileri, ürün listesi, projeler, slaytlar)
`tools/build.py` içinde **tek yerde** tutulur:

| Ne değişecek | build.py içinde |
|---|---|
| Telefon, adres, e-posta, WhatsApp, alan adı, çalışma saatleri | `FIRMA` |
| Ürün grupları ve ürünler | `KATEGORILER` |
| Ana sayfa slaytları | `SLAYTLAR` |
| Projeler | `PROJELER` |
| Uygulama alanları | `SEKTOR` |

Değişiklikten sonra `python3 tools/build.py` çalıştırın; 5 sayfa, `sitemap.xml` ve `robots.txt` yeniden oluşur.
CSS/JS bağlantılarına dosya içeriğine göre otomatik sürüm kodu eklenir (tarayıcı önbelleği sorunu olmaz).

> HTML dosyalarını elle düzenlemek de mümkündür; ancak `build.py` tekrar çalıştırılırsa elle yapılan değişiklikler silinir.
> Bir yöntem seçip onunla devam edin.

## Teklif formu (önemli)

- Formlar **FormSubmit** (formsubmit.co, ücretsiz) ile `info@oguzklima.com` adresine e-posta olarak gönderilir.
  Sunucu tarafında kod gerekmez.
- **Yayından sonra bir kez:** formu siteden gönderin → `info@oguzklima.com` adresine gelen **"Activate Form"**
  e-postasındaki bağlantıya tıklayın. Bundan sonra formlar çalışır.
- İsterseniz hosting'in kendi PHP mail'ine veya başka bir servise geçebilirsiniz: `assets/js/main.js` içindeki
  "Teklif formları" bölümü ve formdaki `data-endpoint` adresi değiştirilir.
- Gönderim başarısız olursa kullanıcıya, doldurduğu bilgilerle hazır **WhatsApp** ve **e-posta** butonları gösterilir.

## SEO ve Google

- Her sayfada özgün `title`/`description`, canonical, Open Graph etiketleri var.
- Firma bilgileri `HVACBusiness` yapılandırılmış verisi (JSON-LD) olarak her sayfada; ürünler `Product`/`ItemList` olarak.
- **Alan adı** `https://www.oguzklima.com` olarak ayarlı (canonical, sitemap, JSON-LD). Farklıysa `FIRMA["domain"]`.
- Yayından sonra: Google Search Console'a `sitemap.xml` gönderin; Google İşletme Profili açın.
  Ayrıntılar: `docs/google-kayit.md`.

## Tasarım sistemi

- **Renkler (logodan):** lacivert `#2F2483`, camgöbeği `#009EE3`. Tüm renkler `style.css` başındaki `:root` değişkenlerinde.
- **Yazı tipleri (Google Fonts):** Archivo (başlıklar), IBM Plex Sans (metin), IBM Plex Mono (ürün kodları, etiketler).
- **Ürün görselleri:** Şu an ürün kartlarında koddan üretilen teknik çizimler (SVG) var. Gerçek ürün fotoğrafı konulacaksa
  ilgili `<div class="illus">` içine `<img>` eklenmesi yeterlidir; çizim otomatik olarak devre dışı kalır.
- Site mobil uyumludur; `prefers-reduced-motion` ayarına saygı gösterir.

## Tamamlanması gerekenler

1. **Projeler:** `PROJELER` listesindeki 6 kayıt **örnektir** ("ÖRNEK" etiketiyle görünür). Gerçek projelerle değiştirilmeli.
2. **Çalışma saatleri:** "Pazartesi – Cumartesi 08:30 – 18:00" firma tarafından teyit edilmeli.
3. **Fotoğraf hakları:** Slayt fotoğrafları firma tarafından sağlandı; ticari kullanım hakları teyit edilmeli.
4. İsteğe bağlı: gerçek ürün fotoğrafları, PDF katalog, referans firma logoları, ürün detay sayfaları.
