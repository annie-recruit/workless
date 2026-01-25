import type { Metadata } from "next";
import "./globals.css";
import SessionProvider from "@/components/SessionProvider";
import { ViewerProvider } from "@/components/ViewerContext";
import { FlagProvider } from "@/components/FlagContext";
import WebVitals from "@/components/WebVitals";
import ConsoleLogger from "@/components/ConsoleLogger";

export const metadata: Metadata = {
  title: "Workless - 개인 비서",
  description: "알아서 정리해주는 개인 비서",
  manifest: "/manifest.json",
  themeColor: "#0f172a",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Workless",
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
  openGraph: {
    title: "Workless - 개인 비서",
    description: "알아서 정리해주는 개인 비서",
    type: "website",
    url: process.env.NEXTAUTH_URL || "https://workless.app",
    siteName: "Workless",
    images: [
      {
        url: "/opengraph-image", // Next.js가 자동으로 생성하는 Open Graph 이미지
        width: 1200,
        height: 630,
        alt: "Workless - 알아서 정리해주는 개인 비서",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Workless - 개인 비서",
    description: "알아서 정리해주는 개인 비서",
    images: ["/opengraph-image"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <link rel="stylesheet" as="style" crossOrigin="" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css" />
      </head>
      <body className="font-pretendard">
        <WebVitals />
        <ConsoleLogger />
        <SessionProvider>
          <ViewerProvider>
            <FlagProvider>{children}</FlagProvider>
          </ViewerProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
