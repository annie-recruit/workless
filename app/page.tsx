import { Metadata } from 'next';
import LandingClient from '@/components/landing/LandingClient';

export const metadata: Metadata = {
  title: 'WORKLESS - 비정형 애자일 워크스페이스 | AI 메모 & 무한 캔버스',
  description: 'WORKLESS는 무한 캔버스에서 아이디어를 자유롭게 배치하고 연결하는 비정형 워크스페이스입니다. Gmail 연동을 통해 이메일을 자동으로 메모로 변환하고, AI가 당신의 생각 조각들을 연결해줍니다. 정형화된 툴에서 벗어나 자유롭게 사고하세요.',
  keywords: ['비정형 메모', '무한 캔버스', '애자일 도구', '아이디어 정리', 'AI 메모', 'Gmail 연동', '생산성 도구', '브레인스토밍', '마인드맵', 'Notion 대안'],
  alternates: {
    canonical: 'https://workless.app',
  },
  openGraph: {
    title: 'WORKLESS - 맥락을 구체화하는 비정형 워크스페이스',
    description: '무한 캔버스에서 아이디어를 자유롭게 배치하고, AI와 함께 생각의 흐름을 시각화하세요.',
    url: 'https://workless.app',
    siteName: 'WORKLESS',
    images: [
      {
        url: '/opengraph-image', // Next.js automatically treats this
        width: 1200,
        height: 630,
        alt: 'WORKLESS - 맥락을 구체화. 비정형 애자일 워크스페이스',
      },
    ],
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'WORKLESS - 비정형 애자일 워크스페이스',
    description: '무한 캔버스에서 아이디어를 자유롭게 배치하고 연결하세요.',
    images: ['/opengraph-image'],
  },
};

export default function LandingPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'WORKLESS',
    applicationCategory: 'ProductivityApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'KRW',
    },
    description: '비정형 애자일 워크스페이스. 무한 캔버스에서 아이디어를 자유롭게 배치하고 연결하세요.',
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      ratingCount: '150',
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <LandingClient />
    </>
  );
}
