#!/bin/bash
# Mac'te çift tıklayınca LifeOS'u örnek verilerle açar (npm run demo).
# İlk seferde Node.js (nodejs.org) ve Docker Desktop kurulu olmalı.
# macOS "doğrulayamadı" deyip açmazsa: Sistem Ayarları → Gizlilik ve Güvenlik →
# Yine de Aç; ya da Terminal'de: bash ~/Desktop/Lifeos/"LifeOS Demo.command"

cd "$(dirname "$0")" || exit 1
dur() {
  echo
  echo "$1"
  read -r -p "Kapatmak için Enter'a basın…"
  exit 1
}

command -v node >/dev/null || {
  open "https://nodejs.org/tr/download"
  dur "Node.js gerekli. Açılan sayfadan LTS sürümünü kurup bu dosyayı tekrar çalıştırın."
}
if ! docker info >/dev/null 2>&1; then
  open -a Docker 2>/dev/null || {
    open "https://www.docker.com/products/docker-desktop/"
    dur "Docker Desktop gerekli. Kurup bir kez açtıktan sonra bu dosyayı tekrar çalıştırın."
  }
  echo "Docker Desktop açılıyor…"
  for _ in $(seq 1 60); do docker info >/dev/null 2>&1 && break; sleep 2; done
  docker info >/dev/null 2>&1 || dur "Docker Desktop açılamadı. Elle açıp bu dosyayı tekrar çalıştırın."
fi
[ -d node_modules ] || npm install || dur "Paketler kurulamadı."

# Uygulama hazır olunca iPad Pro'da aç: Xcode varsa gerçek simülatör, yoksa tarayıcı görünümü
(
  for _ in $(seq 1 300); do curl -sf -o /dev/null http://localhost:3000/giris && break; sleep 2; done
  npm run ipad 2>/dev/null || open "http://localhost:3000/simulator"
) &

npm run demo
