#!/usr/bin/env python3
"""Oğuz Klima web sitesi üretici.

Ortak üst menü / alt bilgi ve ürün listesi tek yerde tutulur; HTML sayfaları buradan üretilir.
Kullanım:  python3 tools/build.py
Firma bilgilerini (telefon, adres, e-posta, alan adı) aşağıdaki FIRMA sözlüğünden değiştirin.
"""
import json
from pathlib import Path
from html import escape

ROOT = Path(__file__).resolve().parent.parent

# ---------------------------------------------------------------------------
# FİRMA BİLGİLERİ — [DOLDURULACAK] olan alanları gerçek bilgilerle değiştirin
# ---------------------------------------------------------------------------
FIRMA = {
    "ad": "Oğuz Klima",
    "unvan": "Oğuz Klima Havalandırma İnşaat San. ve Tic. Ltd. Şti.",
    "domain": "https://www.oguzklima.com.tr",        # [DOLDURULACAK] gerçek alan adı
    "telefon": "+90 XXX XXX XX XX",                   # [DOLDURULACAK]
    "telefon_link": "+900000000000",                  # [DOLDURULACAK] boşluksuz
    "whatsapp": "900000000000",                       # [DOLDURULACAK] ülke koduyla, + olmadan
    "eposta": "info@oguzklima.com.tr",                # [DOLDURULACAK]
    "adres": "Adres bilgisi eklenecek",               # [DOLDURULACAK]
    "sehir": "İstanbul",                              # [DOLDURULACAK]
    "calisma": "Pazartesi – Cumartesi · 08:30 – 18:00",
    "kurulus": "",                                    # [DOLDURULACAK] ör. "2005"
}

# ---------------------------------------------------------------------------
# ÜRÜNLER — kategori > ürün. "illus" değeri assets/js/main.js içindeki çizim adıdır.
# Gerçek fotoğraf eklemek için ürüne "foto": "assets/img/urunler/xxx.webp" yazın.
# ---------------------------------------------------------------------------
KATEGORILER = [
    {
        "id": "menfezler",
        "ad": "Menfezler",
        "illus": "grille-double",
        "ozet": "Duvar, tavan ve kanal üzeri uygulamalar için ayarlı kanatlı üfleme ve emiş menfezleri.",
        "aciklama": "Alüminyum ekstrüzyon profilden üretilen menfezlerimiz; ofis, otel, hastane ve AVM projelerinde "
                    "üfleme ve emiş amaçlı kullanılır. Ölçüye özel üretim, damperli ve plenumlu seçeneklerle sunulur.",
        "urunler": [
            ("OK-TSK", "Tek Sıra Kanatlı Menfez", "grille-single",
             "Yatay veya dikey ayarlanabilir kanatlarla hava yönlendirme. Duvar ve kanal üzeri montaj.",
             [("Malzeme", "Alüminyum"), ("Ölçü", "150×100 – 1500×800 mm"), ("Opsiyon", "Damper, plenum")]),
            ("OK-CSK", "Çift Sıra Kanatlı Menfez", "grille-double",
             "Ön ve arka kanat sıraları bağımsız ayarlanır; hava hem yatay hem dikey yönlendirilir.",
             [("Malzeme", "Alüminyum"), ("Ölçü", "150×100 – 1500×800 mm"), ("Opsiyon", "Karşı kanatlı damper")]),
            ("OK-LNR", "Lineer Menfez", "linear",
             "Sabit kanatlı, uzun boylu uygulamalar için. Cam önü, döşeme ve asma tavan kenarlarında estetik çözüm.",
             [("Kanat açısı", "0° / 15°"), ("Boy", "300 – 3000 mm"), ("Montaj", "Gizli vida / klips")]),
            ("OK-TRF", "Transfer Menfez", "transfer",
             "Kapı ve bölme duvarlarda iki hacim arasında görüş engelleyici hava geçişi sağlar.",
             [("Kanat", "V tipi"), ("Uygulama", "Kapı / duvar"), ("Çerçeve", "Çift taraflı")]),
            ("OK-DFM", "Filtreli Dönüş Menfezi", "return-filter",
             "Menteşeli ön kapak sayesinde filtre değişimi kolaydır. Fan-coil ve dönüş hatlarında kullanılır.",
             [("Filtre", "G3 / G4"), ("Kanat", "45° sabit"), ("Kapak", "Menteşeli")]),
        ],
    },
    {
        "id": "difuzorler",
        "ad": "Difüzörler",
        "illus": "diffuser-square",
        "ozet": "Kare, dairesel, perfore, swirl ve slot difüzörlerle asma tavanlarda homojen hava dağılımı.",
        "aciklama": "Difüzörler tavandan hacme verilen havayı dört yöne veya dairesel olarak dağıtır. "
                    "Modüler asma tavan ölçülerine uygun, sökülebilir göbekli ve plenum kutulu seçenekler mevcuttur.",
        "urunler": [
            ("OK-KTD", "Kare Tavan Difüzörü", "diffuser-square",
             "Dört yöne hava dağıtımı. Sökülebilir göbek sayesinde kolay temizlik ve damper ayarı.",
             [("Modül", "600×600 / 625×625"), ("Boyun", "150 – 600 mm"), ("Yüzey", "RAL 9010 toz boya")]),
            ("OK-DRD", "Dairesel Difüzör", "diffuser-round",
             "Yüksek tavanlı ve açık tavanlı mekânlarda dairesel hava dağılımı sağlar.",
             [("Çap", "Ø150 – Ø600 mm"), ("Malzeme", "Alüminyum"), ("Opsiyon", "Damper, plenum")]),
            ("OK-PRF", "Perfore Difüzör", "perforated",
             "Delikli yüzeyli, dönüş ve üfleme uygulamaları. Temiz oda ve hastanelerde tercih edilir.",
             [("Modül", "600×600 mm"), ("Delik", "Ø5 mm"), ("Yönlendirici", "Opsiyonel")]),
            ("OK-SWR", "Swirl (Girdaplı) Difüzör", "swirl",
             "Girdaplı hava akışıyla hızlı karışım sağlar; yüksek hava debili salonlar için idealdir.",
             [("Ölçü", "Ø400 – Ø800 mm"), ("Kanat", "Ayarlı / sabit"), ("Tavan", "3 – 6 m")]),
            ("OK-SLT", "Lineer Slot Difüzör", "slot",
             "1–4 slotlu, uç uca eklenebilen ince çizgisel görünüm. Mimari projelerde gizli çözüm.",
             [("Slot sayısı", "1 – 4"), ("Slot genişliği", "15 / 20 / 25 mm"), ("Boy", "Projeye göre")]),
            ("OK-JTN", "Jet Nozul", "jet",
             "Uzun atış mesafesi gereken spor salonu, fabrika ve fuar alanlarında hava dağıtımı.",
             [("Çap", "Ø100 – Ø400 mm"), ("Atış", "Uzun mesafe"), ("Ayar", "±30° yönlendirme")]),
        ],
    },
    {
        "id": "damperler",
        "ad": "Damperler",
        "illus": "damper",
        "ozet": "Hava ayar, yangın, geri akış, basınç tahliye ve VAV damperleriyle debi ve güvenlik kontrolü.",
        "aciklama": "Kanal sistemlerinde debi ayarı, geri akışın önlenmesi ve yangın bölmeleri arasında güvenlik için "
                    "damper çözümleri. Manuel kollu veya motorlu (24V / 230V) çalıştırma seçenekleriyle.",
        "urunler": [
            ("OK-HAD", "Hava Ayar Damperi", "damper",
             "Karşı veya paralel kanatlı yapı ile kanal içi debi ayarı ve kapatma.",
             [("Gövde", "Galvaniz sac"), ("Kanat", "Paralel / karşı"), ("Tahrik", "Kol / motor")]),
            ("OK-YGD", "Yangın Damperi", "fire-damper",
             "Yangın bölmeleri arasında alev ve duman geçişini keser. Sigortalı veya motorlu kapanma.",
             [("Tetikleme", "72 °C sigorta"), ("Tahrik", "Yay / motor"), ("Sınıf", "Proje şartnamesine göre")]),
            ("OK-GAD", "Geri Akış (Gravite) Damperi", "backdraft",
             "Hava akışı durduğunda kendiliğinden kapanır, dış havanın ve kokunun geri girişini önler.",
             [("Tip", "Dörtgen / dairesel"), ("Kanat", "Alüminyum"), ("Çalışma", "Yerçekimi")]),
            ("OK-BTD", "Basınç Tahliye Damperi", "pressure-relief",
             "Merdiven basınçlandırma ve temiz odalarda aşırı basıncı dengeler.",
             [("Ayar", "Ağırlık / yay"), ("Uygulama", "Duvar / kanal"), ("Gövde", "Alüminyum")]),
            ("OK-VAV", "VAV / CAV Terminal Ünitesi", "vav",
             "Değişken veya sabit debi kontrolü ile zonlara ihtiyaç kadar hava gönderir, enerji tasarrufu sağlar.",
             [("Kontrol", "Basınçtan bağımsız"), ("Çap", "Ø100 – Ø400 mm"), ("Sinyal", "0–10 V / BMS")]),
            ("OK-DDM", "Dairesel Hava Ayar Damperi", "round-damper",
             "Spiro ve flexible kanal hatlarında kelebek tipi debi ayarı.",
             [("Çap", "Ø100 – Ø630 mm"), ("Gövde", "Galvaniz"), ("Tahrik", "Kol / motor")]),
        ],
    },
    {
        "id": "panjurlar",
        "ad": "Panjurlar",
        "illus": "louver",
        "ozet": "Dış hava alış ve atış noktaları için yağmur, kum ve ses önleyici panjur çözümleri.",
        "aciklama": "Cephe ve çatı uygulamalarında taze hava alışı ve egzoz atışı için dayanıklı panjurlar. "
                    "Kuş/böcek teli, filtre ve damper ile birlikte sunulabilir.",
        "urunler": [
            ("OK-DHP", "Dış Hava Panjuru", "louver",
             "Z profil kanatlarla yağmur suyunun içeri girişini sınırlar. Kuş teli standarttır.",
             [("Malzeme", "Alüminyum"), ("Kanat", "Z profil"), ("Opsiyon", "Filtre, damper")]),
            ("OK-KTP", "Kum Tutuculu Panjur", "sand-louver",
             "Dikey kanat geometrisi ile tozlu ve kumlu ortamlarda partikülleri ayrıştırır.",
             [("Kanat", "Dikey, çok kademeli"), ("Uygulama", "Endüstri / enerji"), ("Tahliye", "Alt drenaj")]),
            ("OK-AKP", "Akustik Panjur", "acoustic-louver",
             "Ses yutucu dolgulu kanatlarla jeneratör ve chiller odalarında gürültüyü azaltır.",
             [("Dolgu", "Taş yünü"), ("Derinlik", "150 / 300 mm"), ("Yüzey", "Toz boya")]),
        ],
    },
    {
        "id": "kapaklar",
        "ad": "Müdahale Kapakları",
        "illus": "access-door",
        "ozet": "Tavan ve duvarlarda tesisata erişim için gizli menteşeli müdahale ve kontrol kapakları.",
        "aciklama": "Asma tavan ve alçıpan duvarlarda vana, damper ve tesisat elemanlarına erişim sağlar. "
                    "Alçı gömme, alüminyum çerçeveli ve kanal tipi seçenekler.",
        "urunler": [
            ("OK-MKK", "Müdahale Kapağı", "access-door",
             "Bas-aç kilit ve gizli menteşe ile düzgün yüzey. Alçıpan ve metal tavanlara uygun.",
             [("Ölçü", "200×200 – 1200×1200 mm"), ("Çerçeve", "Alüminyum"), ("Kilit", "Bas-aç / anahtarlı")]),
            ("OK-KMK", "Kanal Müdahale Kapağı", "access-door",
             "Kanal içi temizlik ve damper bakımı için sızdırmaz contalı servis kapağı.",
             [("Gövde", "Galvaniz"), ("Conta", "EPDM"), ("Bağlantı", "Kelebek somun")]),
        ],
    },
    {
        "id": "susturucular",
        "ad": "Susturucular & Plenum",
        "illus": "silencer",
        "ozet": "Kanal tipi ve dairesel susturucular, menfez ve difüzörler için plenum kutuları.",
        "aciklama": "Fan ve santral kaynaklı gürültüyü kanal içinde azaltan susturucular ile menfez ve difüzörlerin "
                    "kanala bağlantısını sağlayan izoleli plenum kutuları.",
        "urunler": [
            ("OK-SST", "Kanal Tipi Susturucu", "silencer",
             "Taş yünü dolgulu kulisler ile geniş frekans aralığında ses azaltma.",
             [("Kulis", "100 / 200 mm"), ("Boy", "600 – 2400 mm"), ("Gövde", "Galvaniz")]),
            ("OK-DSS", "Dairesel Susturucu", "round-silencer",
             "Spiro kanal hatlarına doğrudan bağlanan silindirik susturucu.",
             [("Çap", "Ø100 – Ø630 mm"), ("Boy", "600 / 900 / 1200 mm"), ("Dolgu", "Taş yünü")]),
            ("OK-PLB", "Plenum Kutusu", "plenum",
             "Difüzör ve menfezler için yan veya üst bağlantılı, izoleli plenum kutusu.",
             [("Bağlantı", "Yan / üst"), ("İzolasyon", "İç yüzey"), ("Opsiyon", "Damperli boyun")]),
        ],
    },
]

TUM_URUNLER = [u[1] for k in KATEGORILER for u in k["urunler"]]

# ---------------------------------------------------------------------------
# Ortak parçalar
# ---------------------------------------------------------------------------
ICON = {
    "phone": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/></svg>',
    "mail": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>',
    "pin": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12z"/><circle cx="12" cy="9" r="2.5"/></svg>',
    "clock": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    "arrow": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    "doc": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/></svg>',
    "wa": '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.3 2.2 2.2 0 0 0 .2-1.3c-.1-.1-.3-.2-.5-.3z"/></svg>',
    "ruler": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M3 17 17 3l4 4L7 21z"/><path d="m7 13 2 2m1-5 2 2m1-5 2 2"/></svg>',
    "factory": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M3 21V10l6 4V10l6 4V4h6v17z"/><path d="M7 17h2m4 0h2"/></svg>',
    "truck": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M3 6h11v10H3zM14 10h4l3 3v3h-7"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg>',
    "shield": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/><path d="m9 12 2 2 4-4"/></svg>',
}

ICON["camera"] = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>'
ICON["star"] = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/></svg>'
ICON["box"] = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 7l9-4 9 4v10l-9 4-9-4z"/><path d="M3 7l9 4 9-4M12 11v10"/></svg>'

# Her ürün grubunun kart rengi
TON = {"menfezler": "", "difuzorler": "t-mint", "damperler": "t-sun",
       "panjurlar": "t-coral", "kapaklar": "t-lilac", "susturucular": ""}

# ---------------------------------------------------------------------------
# UYGULAMA ALANLARI — "sahne" değeri assets/js/main.js içindeki mekân çizimidir
# ---------------------------------------------------------------------------
SEKTOR = [
    ("hastane", "Hastaneler", "hospital", "Hijyen ve basınç kontrolünün kritik olduğu ameliyathane, yoğun bakım ve hasta odaları.",
     ["Perfore difüzör", "Basınç tahliye", "Yangın damperi"]),
    ("avm", "AVM & Mağazalar", "mall", "Yüksek tavanlı, kalabalık alanlarda homojen ve güçlü hava dağıtımı.",
     ["Swirl difüzör", "Jet nozul", "Lineer slot"]),
    ("ofis", "Ofis & Plazalar", "office", "Konforlu, sessiz ve mimariyle uyumlu çizgisel hava dağıtımı.",
     ["Lineer slot difüzör", "VAV terminal", "Kare difüzör"]),
    ("otopark", "Otoparklar", "parking", "Egzoz gazı ve duman tahliyesi için panjur ve damper çözümleri.",
     ["Dış hava panjuru", "Yangın damperi", "Menfez"]),
    ("endustri", "Endüstriyel Tesisler", "factory", "Tozlu ve zorlu ortamlar için dayanıklı, ağır hizmet ekipmanları.",
     ["Kum tutuculu panjur", "Jet nozul", "Susturucu"]),
    ("otel", "Otel & Konut", "hotel", "Misafir konforu için sessiz çalışan, göze batmayan menfez çözümleri.",
     ["Lineer menfez", "Transfer menfez", "Müdahale kapağı"]),
]
SEKTOR_AD = {s[0]: s[1] for s in SEKTOR}
SEKTOR_AD["spor"] = "Spor & Eğitim"
SEKTOR_AD["cephe"] = "Cephe & Çatı"

# ---------------------------------------------------------------------------
# PROJELER — daha önce yaptığınız işler
#
# Fotoğraf eklemek için:  assets/img/projeler/<slug>/  klasörü açın ve içine .jpg/.webp/.png koyun.
# build.py klasördeki fotoğrafları otomatik bulur; ilk fotoğraf kapak olur (01.jpg, 02.jpg ... diye adlandırın).
# Fotoğraf yoksa sektöre uygun çizim gösterilir.
#
# "ornek": True olanlar ÖRNEK kayıtlardır; gerçek projelerinizle değiştirin veya silin.
# ---------------------------------------------------------------------------
PROJELER = [
    {"slug": "ornek-hastane", "baslik": "Özel Hastane Havalandırma Ekipmanları", "sektor": "hastane", "sahne": "hospital",
     "sehir": "Şehir eklenecek", "yil": "", "ornek": True,
     "aciklama": "Ameliyathane ve hasta katları için perfore difüzör, basınç tahliye ve yangın damperi temini.",
     "urunler": ["Perfore Difüzör", "Basınç Tahliye Damperi", "Yangın Damperi", "Müdahale Kapağı"]},
    {"slug": "ornek-avm", "baslik": "Alışveriş Merkezi Ortak Alanları", "sektor": "avm", "sahne": "mall",
     "sehir": "Şehir eklenecek", "yil": "", "ornek": True,
     "aciklama": "Galeri boşlukları ve mağaza koridorlarında swirl difüzör ve jet nozul uygulaması.",
     "urunler": ["Swirl Difüzör", "Jet Nozul", "Lineer Slot Difüzör"]},
    {"slug": "ornek-plaza", "baslik": "Ofis Plazası Kat Uygulamaları", "sektor": "ofis", "sahne": "office",
     "sehir": "Şehir eklenecek", "yil": "", "ornek": True,
     "aciklama": "Açık ofis alanlarında lineer slot difüzör ve VAV terminal üniteleri.",
     "urunler": ["Lineer Slot Difüzör", "VAV Terminal", "Plenum Kutusu"]},
    {"slug": "ornek-otopark", "baslik": "Kapalı Otopark Duman Tahliyesi", "sektor": "otopark", "sahne": "parking",
     "sehir": "Şehir eklenecek", "yil": "", "ornek": True,
     "aciklama": "Otopark havalandırma ve duman tahliye hatları için panjur ve damper imalatı.",
     "urunler": ["Dış Hava Panjuru", "Yangın Damperi", "Hava Ayar Damperi"]},
    {"slug": "ornek-fabrika", "baslik": "Üretim Tesisi Havalandırması", "sektor": "endustri", "sahne": "factory",
     "sehir": "Şehir eklenecek", "yil": "", "ornek": True,
     "aciklama": "Üretim holünde jet nozul, kum tutuculu panjur ve kanal tipi susturucu uygulaması.",
     "urunler": ["Jet Nozul", "Kum Tutuculu Panjur", "Kanal Tipi Susturucu"]},
    {"slug": "ornek-otel", "baslik": "Butik Otel Oda ve Koridorları", "sektor": "otel", "sahne": "hotel",
     "sehir": "Şehir eklenecek", "yil": "", "ornek": True,
     "aciklama": "Oda ve koridorlarda lineer menfez, transfer menfez ve müdahale kapakları.",
     "urunler": ["Lineer Menfez", "Transfer Menfez", "Müdahale Kapağı"]},
    {"slug": "ornek-spor-salonu", "baslik": "Kapalı Spor Salonu", "sektor": "spor", "sahne": "sports",
     "sehir": "Şehir eklenecek", "yil": "", "ornek": True,
     "aciklama": "Yüksek tavanlı salonda uzun atışlı jet nozul uygulaması.",
     "urunler": ["Jet Nozul", "Dairesel Difüzör"]},
    {"slug": "ornek-cephe", "baslik": "Konut Projesi Cephe Panjurları", "sektor": "cephe", "sahne": "facade",
     "sehir": "Şehir eklenecek", "yil": "", "ornek": True,
     "aciklama": "Teknik hacimlerin dış hava alış ve atış noktaları için akustik ve dış hava panjurları.",
     "urunler": ["Dış Hava Panjuru", "Akustik Panjur"]},
]

FOTO_UZANTI = {".jpg", ".jpeg", ".png", ".webp"}


def proje_fotolari(slug):
    klasor = ROOT / "assets/img/projeler" / slug
    if not klasor.is_dir():
        return []
    return [f"assets/img/projeler/{slug}/{f.name}" for f in sorted(klasor.iterdir()) if f.suffix.lower() in FOTO_UZANTI]


FONT_LINK = ('<link rel="preconnect" href="https://fonts.googleapis.com">\n'
             '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
             '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@100..125,500..800'
             '&family=IBM+Plex+Mono:wght@500;600&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap">')

def head(title, desc, path, extra_ld=None):
    url = FIRMA["domain"] + "/" + ("" if path == "index.html" else path)
    ld = {
        "@context": "https://schema.org",
        "@type": "LocalBusiness",
        "@id": FIRMA["domain"] + "/#firma",
        "name": FIRMA["unvan"],
        "alternateName": FIRMA["ad"],
        "url": FIRMA["domain"],
        "logo": FIRMA["domain"] + "/assets/img/logo-oguz-klima.png",
        "image": FIRMA["domain"] + "/assets/img/logo-oguz-klima.png",
        "telephone": FIRMA["telefon"],
        "email": FIRMA["eposta"],
        "address": {"@type": "PostalAddress", "streetAddress": FIRMA["adres"],
                    "addressLocality": FIRMA["sehir"], "addressCountry": "TR"},
        "areaServed": "TR",
        "description": "Menfez, difüzör, damper, panjur, müdahale kapağı ve susturucu üretimi.",
    }
    blocks = [ld] + (extra_ld or [])
    ld_html = "\n".join('<script type="application/ld+json">' + json.dumps(b, ensure_ascii=False) + "</script>" for b in blocks)
    return f"""<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{escape(title)}</title>
<meta name="description" content="{escape(desc)}">
<link rel="canonical" href="{url}">
<meta name="robots" content="index, follow">
<meta name="theme-color" content="#2f2483">
<meta property="og:type" content="website">
<meta property="og:locale" content="tr_TR">
<meta property="og:site_name" content="{FIRMA['ad']}">
<meta property="og:title" content="{escape(title)}">
<meta property="og:description" content="{escape(desc)}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{FIRMA['domain']}/assets/img/logo-oguz-klima.png">
<link rel="icon" href="assets/img/favicon.svg" type="image/svg+xml">
{FONT_LINK}
<link rel="stylesheet" href="assets/css/style.css">
{ld_html}
</head>
<body>
<a class="skip" href="#icerik">İçeriğe geç</a>"""



CUR = ' aria-current="page"'


def header(active):
    links = [("index.html", "Ana Sayfa"), ("urunler.html", "Ürünler"), ("projeler.html", "Projeler"),
             ("hakkimizda.html", "Hakkımızda"), ("iletisim.html", "İletişim")]
    nav = "\n".join(
        f'      <a href="{h}"{CUR if h == active else ""}>{t}</a>' for h, t in links)
    return f"""
<div class="topbar">
  <div class="wrap">
    <div class="tb-group">
      <a href="tel:{FIRMA['telefon_link']}">{FIRMA['telefon']}</a>
      <a href="mailto:{FIRMA['eposta']}">{FIRMA['eposta']}</a>
    </div>
    <div class="tb-group"><span>{FIRMA['calisma']}</span></div>
  </div>
</div>
<header class="site-header">
  <div class="wrap">
    <a class="brand" href="index.html" aria-label="{FIRMA['ad']} ana sayfa">
      <img src="assets/img/logo-mark.svg" alt="{FIRMA['ad']} logosu" width="96" height="52">
    </a>
    <button class="nav-toggle" aria-controls="nav" aria-expanded="false" aria-label="Menüyü aç">
      <span></span><span></span><span></span>
    </button>
    <nav class="nav" id="nav" aria-label="Ana menü">
{nav}
      <a class="btn" href="iletisim.html#teklif">Teklif Al</a>
    </nav>
  </div>
</header>
<main id="icerik">"""


def footer(dialog=False):
    cats = "\n".join(f'        <li><a href="urunler.html#{k["id"]}">{k["ad"]}</a></li>' for k in KATEGORILER)
    dlg = """
<dialog class="proj-dialog" id="proj-dialog" aria-labelledby="pd-title">
  <div class="pd-main">
    <button class="pd-close" type="button" aria-label="Kapat">×</button>
    <div class="pd-main-media" style="width:100%;height:100%"></div>
    <button class="pd-nav pd-prev" type="button" aria-label="Önceki fotoğraf">‹</button>
    <button class="pd-nav pd-next" type="button" aria-label="Sonraki fotoğraf">›</button>
  </div>
  <div class="pd-thumbs"></div>
  <div class="pd-body">
    <h3 class="pd-title" id="pd-title"></h3>
    <div class="meta pd-meta"></div>
    <p class="pd-desc"></p>
    <div class="tags pd-tags"></div>
  </div>
</dialog>""" if dialog else ""
    return f"""</main>
{dlg}
<footer class="site-footer">
  <div class="wrap">
    <div>
      <img src="assets/img/logo-oguz-klima.svg" alt="{FIRMA['unvan']}" width="125" height="96">
      <p>Menfez, difüzör, damper ve panjur üretiminde projeye özel ölçü, hızlı teslim ve teknik destek.</p>
    </div>
    <div>
      <h4>Ürünler</h4>
      <ul>
{cats}
      </ul>
    </div>
    <div>
      <h4>Kurumsal</h4>
      <ul>
        <li><a href="hakkimizda.html">Hakkımızda</a></li>
        <li><a href="projeler.html">Projeler</a></li>
        <li><a href="hakkimizda.html#uretim">Üretim Süreci</a></li>
        <li><a href="iletisim.html#teklif">Teklif İste</a></li>
      </ul>
    </div>
    <div>
      <h4>İletişim</h4>
      <ul>
        <li><a href="tel:{FIRMA['telefon_link']}">{FIRMA['telefon']}</a></li>
        <li><a href="mailto:{FIRMA['eposta']}">{FIRMA['eposta']}</a></li>
        <li>{FIRMA['adres']}</li>
        <li>{FIRMA['calisma']}</li>
      </ul>
    </div>
  </div>
  <div class="footer-bottom">
    <div class="wrap">
      <span>© <span id="yil">2026</span> {FIRMA['unvan']}</span>
      <span>Tüm hakları saklıdır.</span>
    </div>
  </div>
</footer>

<a class="wa" href="https://wa.me/{FIRMA['whatsapp']}" target="_blank" rel="noopener" aria-label="WhatsApp ile yazın">{ICON['wa']}</a>
<script src="assets/js/main.js" defer></script>
</body>
</html>
"""


def cta_band():
    return f"""
<section class="cta-band" aria-label="Teklif">
  <div class="wrap">
    <div class="cta-box">
      <div>
        <h2>Projenizin menfez ve damper listesini gönderin.</h2>
        <p>Metraj listenizi veya proje çizimlerinizi iletin, aynı gün içinde fiyat teklifi hazırlayalım.</p>
      </div>
      <div class="actions">
        <a class="btn btn-sun" href="iletisim.html#teklif">Teklif İste {ICON['arrow']}</a>
        <a class="btn btn-white" href="https://wa.me/{FIRMA['whatsapp']}" target="_blank" rel="noopener">WhatsApp</a>
      </div>
    </div>
  </div>
</section>"""


def page_hero(crumb, title, text, art_attr):
    return f"""
<section class="page-hero">
  <div class="wrap">
    <div>
      <nav class="crumbs" aria-label="Sayfa yolu"><a href="index.html">Ana Sayfa</a> / {crumb}</nav>
      <h1>{title}</h1>
      <p>{text}</p>
    </div>
    <div class="ph-art bob" {art_attr}></div>
  </div>
</section>"""


def proje_kart(p, extra_cls=""):
    fotolar = proje_fotolari(p["slug"])
    veri = {"baslik": p["baslik"], "sektor": SEKTOR_AD.get(p["sektor"], ""), "sehir": p.get("sehir", ""),
            "yil": p.get("yil", ""), "aciklama": p.get("aciklama", ""), "urunler": p.get("urunler", []),
            "fotolar": fotolar, "sahne": p["sahne"]}
    if fotolar:
        media = f'<img src="{fotolar[0]}" alt="{escape(p["baslik"])}" loading="lazy">'
        shots = f'<span class="shots">{ICON["camera"]} {len(fotolar)} fotoğraf</span>'
        attr = ""
    else:
        media, shots = "", ""
        attr = f' data-scene="{p["sahne"]}"'
    ornek = '<span class="sample">ÖRNEK</span>' if p.get("ornek") else ""
    meta = " · ".join(x for x in [p.get("sehir", ""), p.get("yil", "")] if x)
    return f"""
      <button type="button" class="project{extra_cls}" data-sektor="{p['sektor']}" data-proj='{escape(json.dumps(veri, ensure_ascii=False), quote=True)}'>
        <div class="ph"{attr}>{media}<span class="badge">{SEKTOR_AD.get(p['sektor'], '')}</span>{ornek}{shots}</div>
        <div class="info">
          <h3>{p['baslik']}</h3>
          <div class="meta"><span>{meta}</span><span>{len(p.get('urunler', []))} ürün grubu</span></div>
        </div>
      </button>"""


# ---------------------------------------------------------------------------
# ANA SAYFA
# ---------------------------------------------------------------------------
def index():
    cats = []
    for k in KATEGORILER:
        cats.append(f"""
      <a class="cat {TON.get(k['id'], '')}" href="urunler.html#{k['id']}">
        <div class="illus" data-illus="{k['illus']}"><span class="count">{len(k['urunler'])} ÜRÜN</span></div>
        <div class="body">
          <h3>{k['ad']}</h3>
          <p>{k['ozet']}</p>
          <span class="more">Ürünleri incele →</span>
        </div>
      </a>""")
    sectors = "".join(f"""
      <article class="scene-card">
        <div class="scene" data-scene="{sahne}"></div>
        <div class="body">
          <h3>{ad}</h3>
          <p>{acik}</p>
          <div class="tags">{''.join(f'<span class="tag">{t}</span>' for t in tags)}</div>
        </div>
      </article>""" for _, ad, sahne, acik, tags in SEKTOR)
    projs = "".join(proje_kart(p) for p in PROJELER[:6])

    ld_extra = [{
        "@context": "https://schema.org", "@type": "WebSite", "name": FIRMA["ad"], "url": FIRMA["domain"],
        "inLanguage": "tr-TR"}]

    return head(
        "Menfez, Difüzör, Damper ve Panjur Üreticisi | Oğuz Klima Havalandırma",
        "Oğuz Klima; menfez, difüzör, yangın damperi, VAV, dış hava panjuru, müdahale kapağı ve susturucu üretir. "
        "Projeye özel ölçü, hızlı teslim. Hemen teklif alın.",
        "index.html", ld_extra) + header("index.html") + f"""

<section class="hero" aria-labelledby="hero-baslik">
  <div class="wrap">
    <div>
      <span class="eyebrow">Havalandırma ekipmanları üretimi</span>
      <h1 id="hero-baslik">Temiz hava, <span class="hl">doğru yönde</span> aksın.</h1>
      <p class="lead">Menfez, difüzör, damper, panjur ve müdahale kapaklarını projenizin ölçüsüne göre üretiyoruz.
        Hastaneden otoparka, ofisten fabrikaya kadar tüm havalandırma projeleriniz için tek tedarikçi.</p>
      <div class="actions">
        <a class="btn btn-primary" href="urunler.html">Ürünleri İncele {ICON['arrow']}</a>
        <a class="btn btn-outline" href="projeler.html">Projelerimiz</a>
      </div>
      <div class="chips">
        <span class="chip c1"><i>{ICON['box']}</i><span><b>{len(TUM_URUNLER)}+</b> ürün tipi</span></span>
        <span class="chip c2"><i>{ICON['ruler']}</i><span><b>%100</b> ölçüye özel</span></span>
        <span class="chip c3"><i>{ICON['star']}</i><span><b>{len(PROJELER)}+</b> proje</span></span>
      </div>
    </div>
    <div class="hero-visual" data-hero role="img" aria-label="Bina kesiti: ofis, hastane, mağaza, otel ve otoparkta havalandırma ürünleri"></div>
  </div>
</section>

<section id="urun-gruplari" aria-labelledby="urun-baslik">
  <div class="wrap">
    <div class="section-head row">
      <div style="display:grid;gap:14px">
        <span class="eyebrow">Ürün gruplarımız</span>
        <h2 id="urun-baslik">Havalandırma sisteminin her noktası için bir ürün</h2>
      </div>
      <a class="btn btn-outline" href="urunler.html">Tüm ürünler</a>
    </div>
    <div class="cat-grid">{''.join(cats)}
    </div>
  </div>
</section>

<div class="stats-band" aria-label="Rakamlarla Oğuz Klima">
  <div class="wrap">
    <div><b>{len(KATEGORILER)}</b><span>ürün grubu</span></div>
    <div><b>{len(TUM_URUNLER)}+</b><span>ürün tipi</span></div>
    <div><b>RAL</b><span>tüm renklerde toz boya</span></div>
    <div><b>81 il</b><span>Türkiye geneline sevkiyat</span></div>
  </div>
</div>

<section class="tint" aria-labelledby="sektor-baslik">
  <div class="wrap">
    <div class="section-head center">
      <span class="eyebrow">Uygulama alanları</span>
      <h2 id="sektor-baslik">Hangi projede, hangi ürün?</h2>
      <p>Her yapının hava dağıtımı ve güvenlik ihtiyacı farklıdır. Proje ekiplerine doğru ürün seçiminde teknik destek veriyoruz.</p>
    </div>
    <div class="scene-grid">{sectors}
    </div>
  </div>
</section>

<section aria-labelledby="proje-baslik">
  <div class="wrap">
    <div class="section-head row">
      <div style="display:grid;gap:14px">
        <span class="eyebrow">Projelerimiz</span>
        <h2 id="proje-baslik">Ürünlerimizin çalıştığı yerler</h2>
      </div>
      <a class="btn btn-outline" href="projeler.html">Tüm projeler</a>
    </div>
    <div class="proj-grid">{projs}
    </div>
  </div>
</section>

<section class="tint-warm" aria-labelledby="neden-baslik">
  <div class="wrap why">
    <div>
      <span class="eyebrow">Neden Oğuz Klima</span>
      <h2 id="neden-baslik" style="font-size:clamp(30px,3.8vw,46px);font-weight:800;margin-top:14px;color:var(--navy)">Şartnameye uygun ürün, söz verilen tarihte şantiyede.</h2>
      <div class="why-list">
        <div class="why-item"><div class="ic">{ICON['ruler']}</div><h3>Ölçüye özel üretim</h3><p>Standart dışı menfez, difüzör ve damperleri projenize göre imal ediyoruz.</p></div>
        <div class="why-item"><div class="ic">{ICON['factory']}</div><h3>Kendi üretimimiz</h3><p>Kesimden boyaya tüm aşamalar kontrolümüzde; kalite ve termin tek elde.</p></div>
        <div class="why-item"><div class="ic">{ICON['truck']}</div><h3>Hızlı teslimat</h3><p>Stoklu ürünlerde hızlı sevkiyat, projelerde iş programınıza uygun teslim.</p></div>
        <div class="why-item"><div class="ic">{ICON['shield']}</div><h3>Teknik destek</h3><p>Ürün seçimi, debi ve ölçü hesabında proje ekibinizle birlikte çalışıyoruz.</p></div>
      </div>
    </div>
    <div class="spec-sheet" aria-label="Örnek ürün teknik föyü">
      <div class="sheet-head"><span>TEKNİK FÖY</span><span>OK-SWR</span></div>
      <div class="sheet-draw" data-illus="swirl"></div>
      <table class="spec-table">
        <tr><th>Ürün</th><td>Swirl (Girdaplı) Difüzör</td></tr>
        <tr><th>Malzeme</th><td>Çelik / alüminyum</td></tr>
        <tr><th>Ölçü</th><td>Ø400 – Ø800 mm</td></tr>
        <tr><th>Tavan yüksekliği</th><td>3 – 6 m</td></tr>
        <tr><th>Yüzey</th><td>Elektrostatik toz boya, RAL 9010</td></tr>
        <tr><th>Opsiyon</th><td>Damper, plenum kutusu</td></tr>
      </table>
    </div>
  </div>
</section>
{cta_band()}
""" + footer(dialog=True)


# ---------------------------------------------------------------------------
# ÜRÜNLER
# ---------------------------------------------------------------------------
def urunler():
    filt = "\n".join(f'    <a href="#{k["id"]}">{k["ad"]}</a>' for k in KATEGORILER)
    blocks = []
    items_ld = []
    pos = 1
    for k in KATEGORILER:
        cards = []
        for kod, ad, illus, acik, spec in k["urunler"]:
            dl = "".join(f"<dt>{a}</dt><dd>{b}</dd>" for a, b in spec)
            cards.append(f"""
      <article class="product" id="{kod.lower()}">
        <div class="illus" data-illus="{illus}"><span class="code">{kod}</span></div>
        <div class="body">
          <h3>{ad}</h3>
          <p>{acik}</p>
          <dl>{dl}</dl>
          <a class="ask" href="iletisim.html?urun={escape(k['ad'])}#teklif">Bu ürün için teklif iste →</a>
        </div>
      </article>""")
            items_ld.append({"@type": "ListItem", "position": pos,
                             "item": {"@type": "Product", "name": ad, "sku": kod, "description": acik,
                                      "category": k["ad"], "brand": {"@type": "Brand", "name": FIRMA["ad"]},
                                      "url": f"{FIRMA['domain']}/urunler.html#{kod.lower()}"}})
            pos += 1
        blocks.append(f"""
  <section class="cat-block" id="{k['id']}" aria-labelledby="h-{k['id']}">
    <header>
      <div class="cat-ic" data-illus="{k['illus']}"></div>
      <h2 id="h-{k['id']}">{k['ad']}</h2>
      <span class="code">{len(k['urunler'])} ürün tipi</span>
      <p>{k['aciklama']}</p>
    </header>
    <div class="products">{''.join(cards)}
    </div>
  </section>""")

    ld = [{"@context": "https://schema.org", "@type": "ItemList", "name": "Oğuz Klima Ürünleri",
           "itemListElement": items_ld},
          {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
              {"@type": "ListItem", "position": 1, "name": "Ana Sayfa", "item": FIRMA["domain"] + "/"},
              {"@type": "ListItem", "position": 2, "name": "Ürünler", "item": FIRMA["domain"] + "/urunler.html"}]}]

    return head(
        "Ürünler: Menfez, Difüzör, Yangın Damperi, Panjur | Oğuz Klima",
        "Tek ve çift sıra kanatlı menfez, lineer menfez, kare ve swirl difüzör, jet nozul, yangın damperi, VAV, "
        "dış hava panjuru, müdahale kapağı ve susturucu modelleri.",
        "urunler.html", ld) + header("urunler.html") + page_hero(
        "Ürünler", "Ürün Kataloğu",
        f"{len(KATEGORILER)} ürün grubunda {len(TUM_URUNLER)} ürün tipi. Tüm ürünler proje ölçünüze göre üretilir; ölçü aralıkları tipik değerlerdir.",
        'data-illus="grille-double"') + f"""
<div class="wrap" style="padding-block:24px 0">
  <nav class="filter" aria-label="Ürün grupları">
{filt}
  </nav>
{''.join(blocks)}
</div>
{cta_band()}
""" + footer()


# ---------------------------------------------------------------------------
# PROJELER
# ---------------------------------------------------------------------------
def projeler():
    sektorler = []
    for p in PROJELER:
        if p["sektor"] not in sektorler:
            sektorler.append(p["sektor"])
    btns = '<button type="button" data-f="hepsi" aria-pressed="true">Tümü</button>' + "".join(
        f'<button type="button" data-f="{s}" aria-pressed="false">{SEKTOR_AD.get(s, s)}</button>' for s in sektorler)
    cards = "".join(proje_kart(p) for p in PROJELER)
    ld = [{"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": 1, "name": "Ana Sayfa", "item": FIRMA["domain"] + "/"},
        {"@type": "ListItem", "position": 2, "name": "Projeler", "item": FIRMA["domain"] + "/projeler.html"}]}]
    return head(
        "Projeler ve Referanslar | Oğuz Klima Havalandırma",
        "Oğuz Klima menfez, difüzör, damper ve panjurlarının kullanıldığı hastane, AVM, ofis, otopark, fabrika ve otel projeleri.",
        "projeler.html", ld) + header("projeler.html") + page_hero(
        "Projeler", "Projelerimiz",
        "Ürünlerimizin kullanıldığı projelerden seçkiler. Detay ve fotoğraflar için bir projeye tıklayın.",
        'data-scene="facade" style="border-radius:20px;overflow:hidden"') + f"""
<section style="padding-top:40px">
  <div class="wrap">
    <div class="proj-filter" role="group" aria-label="Sektöre göre filtrele">{btns}</div>
    <div class="proj-grid">{cards}
    </div>
  </div>
</section>
{cta_band()}
""" + footer(dialog=True)


# ---------------------------------------------------------------------------
# HAKKIMIZDA
# ---------------------------------------------------------------------------
def hakkimizda():
    return head(
        "Hakkımızda | Oğuz Klima Havalandırma İnşaat",
        "Oğuz Klima Havalandırma İnşaat San. ve Tic. Ltd. Şti. hakkında: üretim sürecimiz, kalite anlayışımız ve hizmet verdiğimiz sektörler.",
        "hakkimizda.html") + header("hakkimizda.html") + page_hero(
        "Hakkımızda", "Hakkımızda",
        "Havalandırma sistemlerinin görünen yüzü olan menfez ve difüzörlerden, kanal içindeki damper ve susturuculara kadar üretim yapıyoruz.",
        'data-scene="factory" style="border-radius:20px;overflow:hidden"') + f"""
<section>
  <div class="wrap about-grid">
    <div class="prose">
      <span class="eyebrow">Biz kimiz</span>
      <h2 style="font-size:clamp(28px,3.4vw,42px);font-weight:800;color:var(--navy)">Proje ekiplerinin güvendiği havalandırma ekipmanı tedarikçisi</h2>
      <p>{FIRMA['unvan']}, havalandırma ve iklimlendirme sistemleri için hava dağıtım ve kontrol ekipmanları üretir.
        Menfez, difüzör, damper, panjur, müdahale kapağı ve susturucu ürün gruplarımızla mekanik taahhüt firmalarına,
        proje ofislerine ve yatırımcılara hizmet veriyoruz.</p>
      <p>Her projenin ölçüsü, debisi ve mimari beklentisi farklıdır. Bu nedenle ürünlerimizi standart katalog ölçülerinin
        yanında projeye özel olarak da üretiyor, doğru ürün seçimi için teknik destek sağlıyoruz.</p>
      <!-- [DOLDURULACAK] Kuruluş yılı, tesis büyüklüğü, önemli referans projeler gibi firmaya özel bilgileri buraya ekleyin. -->
    </div>
    <div class="facts">
      <div><b>{len(KATEGORILER)}</b><span>ürün grubu</span></div>
      <div><b>{len(TUM_URUNLER)}+</b><span>ürün tipi</span></div>
      <div><b>RAL</b><span>tüm renklerde toz boya seçeneği</span></div>
      <div><b>81 il</b><span>Türkiye geneline sevkiyat</span></div>
    </div>
  </div>
</section>

<section class="tint" id="uretim" aria-labelledby="uretim-baslik">
  <div class="wrap">
    <div class="section-head">
      <span class="eyebrow">Üretim süreci</span>
      <h2 id="uretim-baslik">Siparişten şantiyeye altı adım</h2>
    </div>
    <ol class="process">
      <li><h3>Proje & metraj</h3><p>Çizim veya metraj listenizden ürün ve ölçü tespiti.</p></li>
      <li><h3>Teklif & onay</h3><p>Fiyat, termin ve teknik föylerin onaya sunulması.</p></li>
      <li><h3>Kesim & büküm</h3><p>Alüminyum profil ve galvaniz sacın ölçüye göre işlenmesi.</p></li>
      <li><h3>Montaj</h3><p>Kanat, çerçeve ve mekanizmaların birleştirilmesi.</p></li>
      <li><h3>Toz boya</h3><p>Elektrostatik toz boya ve fırınlama, istenen RAL renginde.</p></li>
      <li><h3>Kontrol & sevkiyat</h3><p>Ölçü ve fonksiyon kontrolü, etiketli ambalajla teslim.</p></li>
    </ol>
  </div>
</section>

<section>
  <div class="wrap">
    <div class="section-head">
      <span class="eyebrow">Çalışma anlayışımız</span>
      <h2>Söz verdiğimiz tarih, şartnamedeki ölçü</h2>
    </div>
    <div class="values">
      <article><h3>Kalite</h3><p>Hammadde girişinden sevkiyata kadar her partide ölçü ve yüzey kontrolü yapıyoruz.</p></article>
      <article><h3>Termin</h3><p>Şantiye iş programınıza göre parçalı ve etiketli sevkiyat planlıyoruz.</p></article>
      <article><h3>Destek</h3><p>Ürün seçimi, montaj detayı ve saha sorularında ulaşabileceğiniz bir teknik ekip.</p></article>
    </div>
  </div>
</section>
{cta_band()}
""" + footer()


# ---------------------------------------------------------------------------
# İLETİŞİM
# ---------------------------------------------------------------------------
def iletisim():
    opts = "".join(f"<option>{k['ad']}</option>" for k in KATEGORILER)
    return head(
        "İletişim ve Teklif | Oğuz Klima Havalandırma",
        "Menfez, difüzör, damper ve panjur siparişleriniz için Oğuz Klima ile iletişime geçin. Teklif formu, telefon ve WhatsApp.",
        "iletisim.html") + header("iletisim.html") + page_hero(
        "İletişim", "İletişim & Teklif",
        "Metraj listenizi, proje çiziminizi veya ürün sorunuzu iletin; en kısa sürede dönüş yapalım.",
        'data-scene="office" style="border-radius:20px;overflow:hidden"') + f"""
<section style="padding-top:40px">
  <div class="wrap">
    <div class="contact-grid">
      <div class="contact-cards">
        <div class="contact-card"><div class="ic">{ICON['phone']}</div><div><h3>Telefon</h3><a href="tel:{FIRMA['telefon_link']}">{FIRMA['telefon']}</a></div></div>
        <div class="contact-card"><div class="ic">{ICON['wa']}</div><div><h3>WhatsApp</h3><a href="https://wa.me/{FIRMA['whatsapp']}" target="_blank" rel="noopener">Mesaj gönderin</a></div></div>
        <div class="contact-card"><div class="ic">{ICON['mail']}</div><div><h3>E-posta</h3><a href="mailto:{FIRMA['eposta']}">{FIRMA['eposta']}</a></div></div>
        <div class="contact-card"><div class="ic">{ICON['pin']}</div><div><h3>Adres</h3><p>{FIRMA['adres']}</p></div></div>
        <div class="contact-card"><div class="ic">{ICON['clock']}</div><div><h3>Çalışma saatleri</h3><p>{FIRMA['calisma']}</p></div></div>
      </div>

      <form class="form" id="teklif-formu" data-to="{FIRMA['eposta']}" aria-labelledby="teklif">
        <h2 id="teklif">Teklif formu</h2>
        <label for="f-ad">Ad Soyad<input id="f-ad" name="ad" autocomplete="name" required></label>
        <label for="f-firma">Firma<input id="f-firma" name="firma" autocomplete="organization"></label>
        <label for="f-tel">Telefon<input id="f-tel" name="telefon" type="tel" autocomplete="tel" required></label>
        <label for="f-eposta">E-posta<input id="f-eposta" name="eposta" type="email" autocomplete="email"></label>
        <label class="full" for="f-urun">Ürün grubu<select id="f-urun" name="urun">{opts}<option>Birden fazla / proje listesi</option></select></label>
        <label class="full" for="f-mesaj">Mesajınız<textarea id="f-mesaj" name="mesaj" placeholder="Ürün, ölçü ve adet bilgisi. Örn: OK-CSK çift sıra kanatlı menfez, 400×200 mm, 24 adet, RAL 9010"></textarea></label>
        <p class="note">Proje dosyalarınızı (PDF, DWG, Excel) e-posta veya WhatsApp ile iletebilirsiniz.</p>
        <p class="status" id="form-status" role="status" hidden></p>
        <div class="full"><button class="btn btn-primary" type="submit">Teklif talebini gönder {ICON['arrow']}</button></div>
      </form>
    </div>

    <div class="map-box">
      <!-- [DOLDURULACAK] Google Haritalar > Paylaş > Harita yerleştir kodundaki iframe'i buraya yapıştırın. -->
      <p>Harita, adres bilgisi eklendiğinde burada görünecek.</p>
    </div>
  </div>
</section>
""" + footer()


FAVICON = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#009ee3"/>
<g stroke="#fff" stroke-width="5" stroke-linecap="round"><path d="M14 20l36-6M14 32l36-6M14 44l36-6"/></g>
<path d="M14 54h36" stroke="#ffb81c" stroke-width="5" stroke-linecap="round"/></svg>
"""


def main():
    pages = {"index.html": index(), "urunler.html": urunler(), "projeler.html": projeler(),
             "hakkimizda.html": hakkimizda(), "iletisim.html": iletisim()}
    for name, html in pages.items():
        (ROOT / name).write_text(html, encoding="utf-8")
    (ROOT / "assets/img/favicon.svg").write_text(FAVICON, encoding="utf-8")
    (ROOT / "assets/img/projeler").mkdir(parents=True, exist_ok=True)

    urls = "\n".join(
        f"  <url><loc>{FIRMA['domain']}/{'' if p == 'index.html' else p}</loc><changefreq>monthly</changefreq>"
        f"<priority>{'1.0' if p == 'index.html' else '0.8'}</priority></url>" for p in pages)
    (ROOT / "sitemap.xml").write_text(
        f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n{urls}\n</urlset>\n',
        encoding="utf-8")
    (ROOT / "robots.txt").write_text(f"User-agent: *\nAllow: /\n\nSitemap: {FIRMA['domain']}/sitemap.xml\n", encoding="utf-8")
    print("Oluşturuldu:", ", ".join(pages))


if __name__ == "__main__":
    main()
