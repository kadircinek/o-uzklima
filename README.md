# Oğuz Klima — Web Sitesi

Oğuz Klima Havalandırma İnşaat San. ve Tic. Ltd. Şti. için statik (HTML/CSS/JS) kurumsal site.

## Yapı

```
index.html, urunler.html, hakkimizda.html, iletisim.html   ← üretilen sayfalar
assets/css/style.css     ← tüm stiller (renkler en üstte)
assets/js/main.js        ← mobil menü, ürün teknik çizimleri, teklif formu
assets/img/              ← logolar (SVG + PNG), favicon
tools/build.py           ← sayfaları üreten betik: firma bilgileri ve ürün listesi burada
docs/rakip-analizi.md    ← rakip analizi, anahtar kelimeler, yapılacaklar
sitemap.xml, robots.txt
```

## Düzenleme

1. Telefon, adres, e-posta, alan adı ve ürünleri `tools/build.py` içinde değiştirin.
2. `python3 tools/build.py` çalıştırın; tüm sayfalar, `sitemap.xml` ve `robots.txt` yeniden oluşur.
3. Yerelde görmek için: `python3 -m http.server` → http://localhost:8000

`[DOLDURULACAK]` ile işaretli alanlar gerçek bilgilerle doldurulmalıdır.
