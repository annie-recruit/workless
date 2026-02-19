import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import SessionProvider from "@/components/SessionProvider";
import { ViewerProvider } from "@/components/ViewerContext";
import { FlagProvider } from "@/components/FlagContext";
import { LanguageProvider } from "@/components/LanguageContext";
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
  metadataBase: new URL('https://workless.me'),
  title: "WORKLESS - 맥락을 구체화. 비정형 애자일 워크스페이스",
  description: "WORKLESS는 무한 캔버스에서 아이디어를 자유롭게 배치하고 연결할 수 있는 비정형 애자일 워크스페이스입니다. AI와 함께 생각의 흐름을 시각화하세요.",
  manifest: "/manifest.json",
  alternates: {
    canonical: '/',
  },
  themeColor: "#4f46e5",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "WORKLESS",
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
  openGraph: {
    title: "WORKLESS - 맥락을 구체화",
    description: "비정형 애자일 워크스페이스. 무한 캔버스에서 아이디어를 자유롭게 배치하고 연결하세요.",
    type: "website",
    url: process.env.NEXTAUTH_URL || "https://workless.me",
    siteName: "WORKLESS",
    images: [
      {
        url: "/real_logo.png",
        width: 762,
        height: 660,
        alt: "WORKLESS - 맥락을 구체화. 비정형 애자일 워크스페이스",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "WORKLESS - 맥락을 구체화",
    description: "비정형 애자일 워크스페이스. 무한 캔버스에서 아이디어를 자유롭게 배치하고 연결하세요.",
    images: ["/real_logo.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning className={galmuri.variable} style={{ background: '#1e1b4b' }}>
      <head>
        <link rel="preconnect" href="https://api.iconify.design" />
        <link rel="apple-touch-icon" href="/real_logo.png" />
        <link rel="icon" href="/real_logo.png" />
      </head>
      <body className="flex flex-col min-h-screen" suppressHydrationWarning>
        <WebVitals />
        <ConsoleLogger />
        <SessionProvider>
          <LanguageProvider>
            <ViewerProvider>
              <FlagProvider>
                <div className="flex-1" suppressHydrationWarning>
                  {children}
                </div>
                <Footer />
              </FlagProvider>
            </ViewerProvider>
          </LanguageProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
