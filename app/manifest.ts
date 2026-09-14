import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "W.D SalonHub",
    short_name: "W.D SalonHub",
    description: "叫貨、客戶履歷、燙染配方與照片的共用工作台。",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f4f4f3",
    theme_color: "#111111",
    orientation: "portrait-primary",
    lang: "zh-Hant",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
