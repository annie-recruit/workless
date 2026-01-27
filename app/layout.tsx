import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import SessionProvider from "@/components/SessionProvider";
import { ViewerProvider } from "@/components/ViewerContext";
import { FlagProvider } from "@/components/FlagContext";
import WebVitals from "@/components/WebVitals";
import ConsoleLogger from "@/components/ConsoleLogger";
import Footer from "@/components/Footer";

const galmuri = localFont({
  src: [
    {
      path: "../public/fonts/galmuri/Galmuri11.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../public/fonts/galmuri/Galmuri11-Bold.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-galmuri",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Workless - 사고의 흐름을 보는 비정형 워크스페이스",
  description: "Workless는 Gmail 연동을 통해 이메일을 자동으로 메모로 변환하고, 무한 캔버스에서 아이디어를 자유롭게 배치하고 연결할 수 있는 개인 비서입니다.",
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
    <html lang="ko" suppressHydrationWarning className={galmuri.variable}>
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <link rel="stylesheet" as="style" crossOrigin="" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css" />
      </head>
      <body className="font-pretendard flex flex-col min-h-screen">
        <WebVitals />
        <ConsoleLogger />
        <SessionProvider>
          <ViewerProvider>
            <FlagProvider>
              <div className="flex-1">
                {children}
              </div>
              <Footer />
            </FlagProvider>
          </ViewerProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
