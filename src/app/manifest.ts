import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "LifeOS",
    short_name: "LifeOS",
    description: "Kişisel iş takibi ve hatırlatmalar",
    lang: "tr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f5f6f8",
    theme_color: "#4338ca",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    // Uygulama simgesine uzun basınca çıkan kısayollar
    shortcuts: [
      {
        name: "Hızlı giriş",
        short_name: "Ekle",
        url: "/?ekle=1",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
      { name: "Gelen kutusu", url: "/gelen-kutusu" },
      { name: "Görevler", url: "/gorevler" },
    ],
    // WhatsApp, e-posta vb. uygulamalardan "Paylaş → LifeOS" ile gelen kutusuna at
    share_target: {
      action: "/paylas",
      method: "GET",
      params: { title: "baslik", text: "metin", url: "adres" },
    },
  };
}
