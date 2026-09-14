import type { Metadata, Viewport } from "next";
import { PwaRegister } from "./pwa-register";
import "./globals.css";

export const metadata: Metadata = {
  title: "W.D SalonHub",
  description: "叫貨、客戶履歷、燙染配方與照片的共用工作台。",
  applicationName: "W.D SalonHub",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "W.D SalonHub" },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: "/favicon-32x32.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#111111",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-Hant"><body><PwaRegister />{children}</body></html>;
}
